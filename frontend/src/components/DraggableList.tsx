/**
 * DraggableList – smooth long-press drag-to-reorder list.
 *
 * Supports two layouts:
 *  - "list"  : single-column vertical list (CategoryCards)
 *  - "grid"  : two-column masonry grid (SubcategoryCards / ContentCards)
 *
 * Uses React Native's built-in PanResponder + Animated API so it works on
 * all platforms (web, iOS, Android) without any extra native modules.
 *
 * Usage:
 *   <DraggableList
 *     data={categories}
 *     layout="list"
 *     isReordering={isReordering}
 *     onReorder={(newData) => setLocalData(newData)}
 *     renderItem={(item, isDragged) => <CategoryCard ... />}
 *   />
 */

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  PanResponder,
  Animated,
  StyleSheet,
  Platform,
  LayoutRectangle,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DraggableLayout = "list" | "grid";

interface DraggableListProps<T extends { id: number }> {
  data: T[];
  layout?: DraggableLayout;
  isReordering: boolean;
  onReorder: (newData: T[]) => void;
  renderItem: (item: T, isDragged: boolean) => React.ReactNode;
  /** Gap between columns in px */
  gap?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DraggableList<T extends { id: number }>({
  data,
  layout = "list",
  isReordering,
  onReorder,
  renderItem,
  gap = 12,
}: DraggableListProps<T>) {
  // Local ordered copy that we mutate during drag
  const [ordered, setOrdered] = useState<T[]>(data);

  // Sync when parent data changes (but not mid-drag)
  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrdered(data);
    }
  }, [data]);

  // Index currently being dragged
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Animated translation of the dragged ghost
  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Per-item layout rects (measured on each render via onLayout)
  // These are relative to the container's top-left
  const itemLayouts = useRef<Map<number, LayoutRectangle>>(new Map());

  // Container's position in the page - derived from touch events (locationX/Y)
  const containerPagePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ─── Compute new index from relative hover position ─────────────────────

  const computeHoverIndex = useCallback(
    (relX: number, relY: number, fromIndex: number): number => {
      let bestIndex = fromIndex;
      let bestDist = Infinity;

      ordered.forEach((item, idx) => {
        const rect = itemLayouts.current.get(item.id);
        if (!rect) return;
        const centerY = rect.y + rect.height / 2;
        const centerX = rect.x + rect.width / 2;
        const dist =
          layout === "grid"
            ? Math.hypot(relX - centerX, relY - centerY)
            : Math.abs(relY - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = idx;
        }
      });

      return bestIndex;
    },
    [ordered, layout]
  );

  // ─── Reorder helper ─────────────────────────────────────────────────────

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setOrdered((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // ─── Build PanResponder for each item ───────────────────────────────────

  const buildPanResponder = useCallback(
    (index: number) => {
      let longPressTimer: ReturnType<typeof setTimeout> | null = null;
      let activated = false;
      // We track the current drag index in a local ref to avoid stale closures
      const currentDragIdxRef = { current: index };

      return PanResponder.create({
        onStartShouldSetPanResponder: () => isReordering,
        onMoveShouldSetPanResponder: () => isReordering && activated,
        onMoveShouldSetPanResponderCapture: () => isReordering && activated,

        onPanResponderGrant: (evt) => {
          if (!isReordering) return;
          // Capture container absolute position from first touch
          const { pageX, pageY } = evt.nativeEvent;
          // We'll compute the container pos as (pageX - locationX, pageY - locationY)
          containerPagePos.current = {
            x: pageX - evt.nativeEvent.locationX,
            y: pageY - evt.nativeEvent.locationY,
          };
          activated = false;
          currentDragIdxRef.current = index;

          longPressTimer = setTimeout(() => {
            activated = true;
            isDraggingRef.current = true;
            dragTranslate.setValue({ x: 0, y: 0 });
            setDragIndex(index);
          }, 350);
        },

        onPanResponderMove: (evt, gestureState) => {
          if (!activated) return;
          const { pageX, pageY } = evt.nativeEvent;

          dragTranslate.setValue({
            x: layout === "grid" ? gestureState.dx : 0,
            y: gestureState.dy,
          });

          // Convert absolute touch to relative-to-container
          const relX = pageX - containerPagePos.current.x;
          const relY = pageY - containerPagePos.current.y;

          const newIdx = computeHoverIndex(relX, relY, currentDragIdxRef.current);
          if (newIdx !== currentDragIdxRef.current) {
            moveItem(currentDragIdxRef.current, newIdx);
            currentDragIdxRef.current = newIdx;
            setDragIndex(newIdx);
          }
        },

        onPanResponderRelease: () => {
          if (longPressTimer) clearTimeout(longPressTimer);
          if (!activated) return;
          activated = false;
          isDraggingRef.current = false;

          // Snap ghost back
          Animated.spring(dragTranslate, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: Platform.OS !== "web",
            friction: 8,
          }).start(() => {
            setDragIndex(null);
          });

          onReorder(ordered);
        },

        onPanResponderTerminate: () => {
          if (longPressTimer) clearTimeout(longPressTimer);
          activated = false;
          isDraggingRef.current = false;
          dragTranslate.setValue({ x: 0, y: 0 });
          setDragIndex(null);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReordering, ordered, layout, computeHoverIndex, moveItem, onReorder]
  );

  // ─── Render list layout ─────────────────────────────────────────────────

  if (layout === "list") {
    return (
      <View
        style={styles.listContainer}
      >
        {ordered.map((item, idx) => {
          const isDragged = dragIndex === idx;
          const panHandlers = isReordering
            ? buildPanResponder(idx).panHandlers
            : {};

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.listItem,
                isDragged && styles.draggedItem,
                isDragged && {
                  transform: [
                    { translateX: 0 as unknown as number },
                    { translateY: dragTranslate.y as unknown as number },
                    { scale: 1.03 },
                  ],
                  zIndex: 999,
                  elevation: 20,
                },
              ]}
              onLayout={(e) => {
                itemLayouts.current.set(item.id, e.nativeEvent.layout);
              }}
              {...panHandlers}
            >
              {renderItem(item, isDragged)}
            </Animated.View>
          );
        })}
      </View>
    );
  }

  // ─── Render grid layout ─────────────────────────────────────────────────

  const leftItems = ordered.filter((_, i) => i % 2 === 0);
  const rightItems = ordered.filter((_, i) => i % 2 === 1);

  const renderGridItem = (item: T, globalIdx: number) => {
    const isDragged = dragIndex === globalIdx;
    const panHandlers = isReordering
      ? buildPanResponder(globalIdx).panHandlers
      : {};

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.gridItemWrapper,
          isDragged && styles.draggedItem,
          isDragged && {
            transform: [
              { translateX: dragTranslate.x as unknown as number },
              { translateY: dragTranslate.y as unknown as number },
              { scale: 1.04 },
            ],
            zIndex: 999,
            elevation: 20,
          },
        ]}
        onLayout={(e) => {
          itemLayouts.current.set(item.id, e.nativeEvent.layout);
        }}
        {...panHandlers}
      >
        {renderItem(item, isDragged)}
      </Animated.View>
    );
  };

  return (
    <View
      style={[styles.gridContainer, { gap }]}
    >
      {/* Left column */}
      <View style={styles.gridColumn}>
        {leftItems.map((item) => {
          const globalIdx = ordered.findIndex((o) => o.id === item.id);
          return renderGridItem(item, globalIdx);
        })}
      </View>
      {/* Right column */}
      <View style={styles.gridColumn}>
        {rightItems.map((item) => {
          const globalIdx = ordered.findIndex((o) => o.id === item.id);
          return renderGridItem(item, globalIdx);
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContainer: {
    width: "100%",
  },
  listItem: {
    width: "100%",
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  gridColumn: {
    flex: 1,
    minWidth: 0,
  },
  gridItemWrapper: {
    width: "100%",
  },
  draggedItem: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      } as any,
    }),
  },
});
