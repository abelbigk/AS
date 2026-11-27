/**
 * DraggableList – 60fps Reanimated long-press drag-to-reorder list & 2-column grid.
 *
 * Features:
 *  - Reanimated SharedValues drive drag translation & slot transitions on the UI
 *    thread (zero JS-bridge lag on phones).
 *  - Fixed `data.map(...)` child order + `React.memo` items so swapping never
 *    unmounts/remounts DOM or native views.
 *  - Edge auto-scroll: dragging near the top or bottom of the screen smoothly
 *    scrolls the parent ScrollView while keeping the dragged card under your finger.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Platform,
  LayoutRectangle,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

export type DraggableLayout = "list" | "grid";

interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DraggableListProps<T extends { id: number }> {
  data: T[];
  layout?: DraggableLayout;
  isReordering: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onReorder: (newData: T[]) => void;
  /** Called during edge auto-scroll with pixel delta (positive = scroll down); returns actual applied delta */
  onAutoScroll?: (deltaY: number) => number | void;
  /** Deprecated: kept optional for compatibility */
  scrollOffsetY?: number;
  renderItem: (item: T, isDragged: boolean) => React.ReactNode;
  gap?: number;
}

interface DraggableItemProps<T extends { id: number }> {
  item: T;
  isReordering: boolean;
  isDragged: boolean;
  slot: SlotRect | undefined;
  activeIdSV: SharedValue<number>;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  autoScrollY: SharedValue<number>;
  layout: DraggableLayout;
  onMeasureHeight: (id: number, height: number) => void;
  onActivate: (id: number, absY: number) => void;
  onMove: (translationX: number, translationY: number, absY: number) => void;
  onRelease: () => void;
  renderItem: (item: T, isDragged: boolean) => React.ReactNode;
}

function DraggableItemInner<T extends { id: number }>({
  item,
  isReordering,
  isDragged,
  slot,
  activeIdSV,
  dragX,
  dragY,
  autoScrollY,
  layout,
  onMeasureHeight,
  onActivate,
  onMove,
  onRelease,
  renderItem,
}: DraggableItemProps<T>) {
  const itemId = item.id;
  const callbacksRef = useRef({
    id: itemId,
    isReordering,
    onActivate,
    onMove,
    onRelease,
  });
  callbacksRef.current = {
    id: itemId,
    isReordering,
    onActivate,
    onMove,
    onRelease,
  };

  const webCleanupRef = useRef<(() => void) | null>(null);
  const blockClickRef = useRef(false);

  useEffect(() => {
    return () => {
      webCleanupRef.current?.();
      webCleanupRef.current = null;
    };
  }, []);

  // Reanimated slot coordinates (used via transform translateX/Y, never left/top)
  const hasMeasuredSlot = useRef(false);
  const slotX = useSharedValue(slot?.x ?? 0);
  const slotY = useSharedValue(slot?.y ?? 0);

  useEffect(() => {
    if (!slot) return;
    if (!hasMeasuredSlot.current) {
      hasMeasuredSlot.current = true;
      slotX.value = slot.x;
      slotY.value = slot.y;
    } else if (!isDragged && activeIdSV.value !== itemId) {
      slotX.value = withTiming(slot.x, { duration: 150 });
      slotY.value = withTiming(slot.y, { duration: 150 });
    }
  }, [slot?.x, slot?.y, isDragged, itemId, activeIdSV, slotX, slotY]);

  const isGrid = layout === "grid";

  // 100% UI-thread transform: follows finger strictly from frame 0 with zero JS lag
  const animatedStyle = useAnimatedStyle(() => {
    if (activeIdSV.value === itemId) {
      return {
        zIndex: 999,
        elevation: 20,
        transform: [
          { translateX: slotX.value + (isGrid ? dragX.value : 0) },
          { translateY: slotY.value + dragY.value + autoScrollY.value },
          { scale: 1.03 },
        ],
      };
    }
    return {
      zIndex: 1,
      elevation: 0,
      transform: [
        { translateX: slotX.value },
        { translateY: slotY.value },
        { scale: 1 },
      ],
    };
  });

  // Native UI-thread Gesture.Pan (never recreated mid-drag)
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(220)
        .onStart((e) => {
          "worklet";
          activeIdSV.value = itemId;
          dragX.value = 0;
          dragY.value = 0;
          autoScrollY.value = 0;
          runOnJS(callbacksRef.current.onActivate)(itemId, e.absoluteY);
        })
        .onUpdate((e) => {
          "worklet";
          dragX.value = isGrid ? e.translationX : 0;
          dragY.value = e.translationY;
          runOnJS(callbacksRef.current.onMove)(
            e.translationX,
            e.translationY,
            e.absoluteY
          );
        })
        .onEnd(() => {
          "worklet";
          if (activeIdSV.value === itemId) {
            slotX.value = slotX.value + (isGrid ? dragX.value : 0);
            slotY.value = slotY.value + dragY.value + autoScrollY.value;
            activeIdSV.value = -1;
            runOnJS(callbacksRef.current.onRelease)();
          }
        })
        .onFinalize(() => {
          "worklet";
          if (activeIdSV.value === itemId) {
            slotX.value = slotX.value + (isGrid ? dragX.value : 0);
            slotY.value = slotY.value + dragY.value + autoScrollY.value;
            activeIdSV.value = -1;
            runOnJS(callbacksRef.current.onRelease)();
          }
        }),
    [itemId, activeIdSV, dragX, dragY, autoScrollY, slotX, slotY, isGrid]
  );

  // Web pointer handler using window listeners
  const handleWebPointerDown = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;
      if (e.button !== undefined && e.button !== 0) return;

      webCleanupRef.current?.();

      const startX = e.clientX;
      const startY = e.clientY;
      let activated = false;
      const prevBodyTouchAction =
        typeof document !== "undefined" ? document.body.style.touchAction : "";

      const holdMs = callbacksRef.current.isReordering ? 90 : 220;
      const timer = setTimeout(() => {
        activated = true;
        blockClickRef.current = true;
        if (typeof document !== "undefined") {
          document.body.style.touchAction = "none";
        }
        activeIdSV.value = itemId;
        dragX.value = 0;
        dragY.value = 0;
        autoScrollY.value = 0;
        callbacksRef.current.onActivate(itemId, startY);
      }, holdMs);

      const onTouchMove = (touchEvt: TouchEvent) => {
        if (activated) {
          touchEvt.preventDefault();
        }
      };

      const preventBrowserHold = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };

      const onPointerMove = (moveEvt: PointerEvent) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;

        if (!activated) {
          if (Math.hypot(dx, dy) > 8) {
            cleanup();
          }
          return;
        }

        moveEvt.preventDefault();
        dragX.value = isGrid ? dx : 0;
        dragY.value = dy;
        callbacksRef.current.onMove(dx, dy, moveEvt.clientY);
      };

      const onPointerUp = () => {
        const wasActive = activated;
        cleanup();
        if (wasActive) {
          if (activeIdSV.value === itemId) {
            slotX.value = slotX.value + (isGrid ? dragX.value : 0);
            slotY.value = slotY.value + dragY.value + autoScrollY.value;
            activeIdSV.value = -1;
          }
          callbacksRef.current.onRelease();
          setTimeout(() => {
            blockClickRef.current = false;
          }, 120);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        if (typeof document !== "undefined") {
          document.body.style.touchAction = prevBodyTouchAction;
        }
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        window.removeEventListener("contextmenu", preventBrowserHold, true);
        window.removeEventListener("dragstart", preventBrowserHold, true);
        window.removeEventListener("selectstart", preventBrowserHold, true);
        webCleanupRef.current = null;
      };

      webCleanupRef.current = cleanup;
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      window.addEventListener("contextmenu", preventBrowserHold, true);
      window.addEventListener("dragstart", preventBrowserHold, true);
      window.addEventListener("selectstart", preventBrowserHold, true);
    },
    [itemId, activeIdSV, dragX, dragY, autoScrollY, slotX, slotY, isGrid]
  );

  const baseStyle: any = slot
    ? {
        position: "absolute",
        left: 0,
        top: 0,
        width: slot.width,
      }
    : {
        width: "100%",
        opacity: 0,
      };

  const webProps: any =
    Platform.OS === "web"
      ? {
          onPointerDown: handleWebPointerDown,
          onDragStart: (e: any) => e.preventDefault(),
          onDragStartCapture: (e: any) => e.preventDefault(),
          onContextMenu: (e: any) => e.preventDefault(),
          onClickCapture: (e: any) => {
            if (blockClickRef.current) {
              e.stopPropagation();
              e.preventDefault();
            }
          },
        }
      : {};

  const content = (
    <Animated.View
      style={[
        baseStyle,
        slot ? animatedStyle : undefined,
        isDragged && styles.draggedItem,
        Platform.OS === "web" &&
          ({
            WebkitUserDrag: "none",
            ...(isDragged ? { touchAction: "none", cursor: "grabbing" } : {}),
          } as any),
      ]}
      onLayout={(e: { nativeEvent: { layout: LayoutRectangle } }) => {
        onMeasureHeight(item.id, e.nativeEvent.layout.height);
      }}
      {...webProps}
    >
      {renderItem(item, isDragged)}
    </Animated.View>
  );

  if (Platform.OS === "web") {
    return content;
  }

  return <GestureDetector gesture={panGesture}>{content}</GestureDetector>;
}

const DraggableItem = React.memo(DraggableItemInner) as typeof DraggableItemInner;

export function DraggableList<T extends { id: number }>({
  data,
  layout = "list",
  isReordering,
  onDragStart,
  onDragEnd,
  onReorder,
  onAutoScroll,
  renderItem,
  gap = 12,
}: DraggableListProps<T>) {
  const [orderIds, setOrderIds] = useState<number[]>(() => data.map((d) => d.id));
  const orderIdsRef = useRef<number[]>(orderIds);
  orderIdsRef.current = orderIds;

  const dataMap = useMemo(() => {
    const m = new Map<number, T>();
    data.forEach((d) => m.set(d.id, d));
    return m;
  }, [data]);
  const dataMapRef = useRef(dataMap);
  dataMapRef.current = dataMap;

  const isDraggingRef = useRef(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const draggedIdRef = useRef<number | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const heightsRef = useRef<Map<number, number>>(new Map());
  const [layoutTick, setLayoutTick] = useState(0);

  // Sync orderIds from parent when parent data IDs/order changes and not mid-drag
  const dataKey = data.map((d) => d.id).join(",");
  useEffect(() => {
    if (!isDraggingRef.current) {
      const nextIds = data.map((d) => d.id);
      setOrderIds(nextIds);
      orderIdsRef.current = nextIds;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  const activeIdSV = useSharedValue(-1);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const autoScrollY = useSharedValue(0);

  const startSlotPos = useRef<SlotRect | null>(null);
  const lastTranslation = useRef({ x: 0, y: 0 });
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDeltaRef = useRef(0);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
    autoScrollDeltaRef.current = 0;
  }, []);

  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  // Compute slot positions based on `orderIds`
  const { slots, totalHeight } = useMemo(() => {
    const map = new Map<number, SlotRect>();
    if (containerWidth <= 0) {
      return { slots: map, totalHeight: 0 };
    }

    if (layout === "list") {
      let y = 0;
      for (let i = 0; i < orderIds.length; i++) {
        const id = orderIds[i];
        const h = heightsRef.current.get(id) ?? 124;
        map.set(id, { x: 0, y, width: containerWidth, height: h });
        y += h;
      }
      return { slots: map, totalHeight: y };
    }

    const colWidth = (containerWidth - gap) / 2;
    let leftY = 0;
    let rightY = 0;
    for (let i = 0; i < orderIds.length; i++) {
      const id = orderIds[i];
      const h = heightsRef.current.get(id) ?? 180;
      const isLeft = i % 2 === 0;
      const x = isLeft ? 0 : colWidth + gap;
      const y = isLeft ? leftY : rightY;
      map.set(id, { x, y, width: colWidth, height: h });
      if (isLeft) leftY += h;
      else rightY += h;
    }
    return { slots: map, totalHeight: Math.max(leftY, rightY) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIds, containerWidth, layout, gap, layoutTick]);

  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const handleMeasureHeight = useCallback((id: number, height: number) => {
    const prev = heightsRef.current.get(id);
    if (prev === undefined || Math.abs(prev - height) > 0.5) {
      heightsRef.current.set(id, height);
      setLayoutTick((t) => t + 1);
    }
  }, []);

  const handleActivate = useCallback(
    (id: number) => {
      const rect = slotsRef.current.get(id) ?? null;
      startSlotPos.current = rect;
      isDraggingRef.current = true;
      draggedIdRef.current = id;
      lastTranslation.current = { x: 0, y: 0 };
      setDraggedId(id);

      if (Platform.OS !== "web") {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      }

      onDragStart?.();
    },
    [onDragStart]
  );

  const handleMove = useCallback(
    (translationX: number, translationY: number, absY: number) => {
      if (!isDraggingRef.current || draggedIdRef.current === null) return;
      lastTranslation.current = { x: translationX, y: translationY };

      // Check edge auto-scroll (no React re-renders during drag)
      if (onAutoScroll) {
        const screenH = Dimensions.get("window").height;
        const edgeZone = 120;
        let speed = 0;
        if (absY > screenH - edgeZone) {
          speed = 12;
        } else if (absY < edgeZone) {
          speed = -12;
        }

        if (speed !== 0) {
          autoScrollDeltaRef.current = speed;
          if (!autoScrollTimerRef.current) {
            autoScrollTimerRef.current = setInterval(() => {
              if (!isDraggingRef.current) return;
              const applied = onAutoScroll(autoScrollDeltaRef.current);
              if (typeof applied === "number" && applied !== 0) {
                autoScrollY.value += applied;
              }
            }, 16);
          }
        } else {
          stopAutoScroll();
        }
      }
    },
    [onAutoScroll, autoScrollY, stopAutoScroll]
  );

  const handleRelease = useCallback(() => {
    if (!isDraggingRef.current) return;
    const droppedId = draggedIdRef.current;
    const origin = startSlotPos.current;
    const tx = lastTranslation.current.x;
    const ty = lastTranslation.current.y;
    const scrollDelta = autoScrollY.value;

    isDraggingRef.current = false;
    draggedIdRef.current = null;
    startSlotPos.current = null;
    stopAutoScroll();

    activeIdSV.value = -1;
    dragX.value = 0;
    dragY.value = 0;
    autoScrollY.value = 0;
    setDraggedId(null);

    // Rearrange once on drop based on nearest slot center
    let finalIds = orderIdsRef.current;
    if (droppedId !== null && origin) {
      const curCenterX = origin.x + origin.width / 2 + (layout === "grid" ? tx : 0);
      const curCenterY = origin.y + origin.height / 2 + ty + scrollDelta;
      const currentIdx = finalIds.indexOf(droppedId);

      if (currentIdx !== -1) {
        let targetIdx = currentIdx;
        let bestDist = Infinity;
        for (let i = 0; i < finalIds.length; i++) {
          const rect = slotsRef.current.get(finalIds[i]);
          if (!rect) continue;
          const cx = rect.x + rect.width / 2;
          const cy = rect.y + rect.height / 2;
          const dist =
            layout === "list"
              ? Math.abs(curCenterY - cy)
              : Math.hypot(curCenterX - cx, curCenterY - cy);
          if (dist < bestDist) {
            bestDist = dist;
            targetIdx = i;
          }
        }

        if (targetIdx !== currentIdx) {
          const nextIds = [...finalIds];
          const [moved] = nextIds.splice(currentIdx, 1);
          nextIds.splice(targetIdx, 0, moved);
          finalIds = nextIds;
          orderIdsRef.current = nextIds;
          setOrderIds(nextIds);
        }
      }
    }

    const newOrderedItems = finalIds
      .map((id) => dataMapRef.current.get(id))
      .filter((item): item is T => item !== undefined);

    onReorder(newOrderedItems);
    onDragEnd?.();
  }, [layout, activeIdSV, dragX, dragY, autoScrollY, onReorder, onDragEnd, stopAutoScroll]);

  return (
    <View
      style={[
        styles.container,
        totalHeight > 0 && { height: totalHeight },
        Platform.OS === "web" &&
          ({
            userSelect: "none",
            WebkitUserSelect: "none",
            ...(draggedId !== null ? { touchAction: "none" } : {}),
          } as any),
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 0.5) {
          setContainerWidth(w);
        }
      }}
    >
      {data.map((item) => (
        <DraggableItem
          key={item.id}
          item={item}
          isReordering={isReordering}
          isDragged={draggedId === item.id}
          slot={slots.get(item.id)}
          activeIdSV={activeIdSV}
          dragX={dragX}
          dragY={dragY}
          autoScrollY={autoScrollY}
          layout={layout}
          onMeasureHeight={handleMeasureHeight}
          onActivate={handleActivate}
          onMove={handleMove}
          onRelease={handleRelease}
          renderItem={renderItem}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
  },
  draggedItem: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    ...Platform.select({
      web: {
        boxShadow: "0 10px 28px rgba(0,0,0,0.5)",
      } as any,
    }),
  },
});
