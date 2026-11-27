/**
 * DraggableList – smooth long-press drag-to-reorder list & 2-column masonry grid.
 *
 * Architecture:
 *  - Renders `data.map(...)` in FIXED React/DOM order so children are NEVER
 *    reordered or unmounted in the tree during drag (reordering DOM nodes in a
 *    browser cancels active pointer/touch drags immediately).
 *  - Maintains a separate `orderIds` array that determines each item's visual
 *    (left, top) slot position. Non-dragged items glide smoothly to their new
 *    slots when `orderIds` updates.
 *  - On Web: uses `onPointerDown` + `window` pointermove/pointerup/pointercancel
 *    so nothing (ScrollView, Pressable, zIndex, etc.) can steal or cancel the
 *    drag until the user actually lets go.
 *  - On Native: uses `Gesture.Pan().activateAfterLongPress(280).runOnJS(true)`
 *    with empty deps so the gesture is never recreated mid-drag.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Animated,
  StyleSheet,
  Platform,
  LayoutRectangle,
} from "react-native";
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
  renderItem: (item: T, isDragged: boolean) => React.ReactNode;
  /** Horizontal gap between columns in grid mode (px) */
  gap?: number;
}

interface DraggableItemProps<T extends { id: number }> {
  item: T;
  isReordering: boolean;
  isDragged: boolean;
  slot: SlotRect | undefined;
  startPos: SlotRect | null;
  dragTranslate: Animated.ValueXY;
  layout: DraggableLayout;
  onMeasureHeight: (id: number, height: number) => void;
  onActivate: (id: number) => void;
  onMove: (translationX: number, translationY: number) => void;
  onRelease: () => void;
  renderItem: (item: T, isDragged: boolean) => React.ReactNode;
}

function DraggableItem<T extends { id: number }>({
  item,
  isReordering,
  isDragged,
  slot,
  startPos,
  dragTranslate,
  layout,
  onMeasureHeight,
  onActivate,
  onMove,
  onRelease,
  renderItem,
}: DraggableItemProps<T>) {
  const callbacksRef = useRef({
    id: item.id,
    isReordering,
    onActivate,
    onMove,
    onRelease,
  });
  callbacksRef.current = {
    id: item.id,
    isReordering,
    onActivate,
    onMove,
    onRelease,
  };

  // Cleanup ref for web window listeners
  const webCleanupRef = useRef<(() => void) | null>(null);
  const blockClickRef = useRef(false);

  useEffect(() => {
    return () => {
      webCleanupRef.current?.();
      webCleanupRef.current = null;
    };
  }, []);

  // Native gesture (empty deps so never recreated mid-drag)
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(280)
        .runOnJS(true)
        .onStart(() => {
          callbacksRef.current.onActivate(callbacksRef.current.id);
        })
        .onUpdate((e) => {
          callbacksRef.current.onMove(e.translationX, e.translationY);
        })
        .onEnd(() => {
          callbacksRef.current.onRelease();
        })
        .onFinalize(() => {
          callbacksRef.current.onRelease();
        }),
    []
  );

  // Web pointer handler using window listeners so dragging never cancels early
  const handleWebPointerDown = useCallback((e: any) => {
    if (Platform.OS !== "web") return;
    if (e.button !== undefined && e.button !== 0) return;

    webCleanupRef.current?.();

    const startX = e.clientX;
    const startY = e.clientY;
    let activated = false;
    const prevBodyTouchAction =
      typeof document !== "undefined" ? document.body.style.touchAction : "";

    const holdMs = callbacksRef.current.isReordering ? 100 : 280;
    const timer = setTimeout(() => {
      activated = true;
      blockClickRef.current = true;
      if (typeof document !== "undefined") {
        document.body.style.touchAction = "none";
      }
      callbacksRef.current.onActivate(callbacksRef.current.id);
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
      callbacksRef.current.onMove(dx, dy);
    };

    const onPointerUp = () => {
      const wasActive = activated;
      cleanup();
      if (wasActive) {
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
  }, []);

  const activePos = isDragged && startPos ? startPos : slot;

  const positionStyle: any = activePos
    ? {
        position: "absolute",
        left: activePos.x,
        top: activePos.y,
        width: activePos.width,
        ...(Platform.OS === "web" && !isDragged
          ? { transition: "left 180ms ease, top 180ms ease" }
          : {}),
      }
    : {
        width: "100%",
        opacity: 0,
      };

  const dragStyle: any = isDragged
    ? {
        transform: [
          {
            translateX:
              layout === "grid" ? (dragTranslate.x as unknown as number) : 0,
          },
          { translateY: dragTranslate.y as unknown as number },
          { scale: 1.03 },
        ],
        zIndex: 999,
        elevation: 20,
        ...(Platform.OS === "web" ? { touchAction: "none", cursor: "grabbing" } : {}),
      }
    : {
        zIndex: 1,
        elevation: 0,
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
        positionStyle,
        isDragged && styles.draggedItem,
        dragStyle,
        Platform.OS === "web" && ({ WebkitUserDrag: "none" } as any),
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

export function DraggableList<T extends { id: number }>({
  data,
  layout = "list",
  isReordering,
  onDragStart,
  onDragEnd,
  onReorder,
  renderItem,
  gap = 12,
}: DraggableListProps<T>) {
  // Visual order as array of IDs (never reorders React/DOM children during drag!)
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

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const startSlotPos = useRef<SlotRect | null>(null);

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

    // "grid": 2-column masonry matching even=left, odd=right
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
      dragTranslate.setValue({ x: 0, y: 0 });
      setDraggedId(id);

      if (Platform.OS !== "web") {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      }

      onDragStart?.();
    },
    [dragTranslate, onDragStart]
  );

  const handleMove = useCallback(
    (translationX: number, translationY: number) => {
      if (!isDraggingRef.current || draggedIdRef.current === null) return;
      const origin = startSlotPos.current;
      if (!origin) return;

      const tx = layout === "grid" ? translationX : 0;
      const ty = translationY;
      dragTranslate.setValue({ x: tx, y: ty });

      const curCenterX = origin.x + origin.width / 2 + tx;
      const curCenterY = origin.y + origin.height / 2 + ty;

      const currentIds = orderIdsRef.current;
      const currentIdx = currentIds.indexOf(draggedIdRef.current);
      if (currentIdx === -1) return;

      // Hit-test which slot the dragged center is currently inside
      let targetIdx = -1;
      for (let i = 0; i < currentIds.length; i++) {
        if (i === currentIdx) continue;
        const rect = slotsRef.current.get(currentIds[i]);
        if (!rect) continue;

        const inY =
          curCenterY >= rect.y + 6 && curCenterY <= rect.y + rect.height - 6;
        const inX =
          layout === "list" ||
          (curCenterX >= rect.x + 6 && curCenterX <= rect.x + rect.width - 6);

        if (inX && inY) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx !== -1 && targetIdx !== currentIdx) {
        const nextIds = [...currentIds];
        const [moved] = nextIds.splice(currentIdx, 1);
        nextIds.splice(targetIdx, 0, moved);
        orderIdsRef.current = nextIds;
        setOrderIds(nextIds);
      }
    },
    [dragTranslate, layout]
  );

  const handleRelease = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    draggedIdRef.current = null;
    startSlotPos.current = null;

    dragTranslate.setValue({ x: 0, y: 0 });
    setDraggedId(null);

    const newOrderedItems = orderIdsRef.current
      .map((id) => dataMapRef.current.get(id))
      .filter((item): item is T => item !== undefined);

    onReorder(newOrderedItems);
    onDragEnd?.();
  }, [dragTranslate, onReorder, onDragEnd]);

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
      {/* Render in FIXED `data` order so DOM/native nodes never move in tree */}
      {data.map((item) => (
        <DraggableItem
          key={item.id}
          item={item}
          isReordering={isReordering}
          isDragged={draggedId === item.id}
          slot={slots.get(item.id)}
          startPos={draggedId === item.id ? startSlotPos.current : null}
          dragTranslate={dragTranslate}
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
