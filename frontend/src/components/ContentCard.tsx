import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "../contexts/ThemeContext";
import {
  Clock,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2,
  FolderMinus,
  FolderPlus,
  ArrowUp,
  ArrowDown,
} from "lucide-react-native";
import { DropdownMenu } from "./DropdownMenu";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";

export interface ContentItem {
  id: number;
  userId: number;
  heading: string;
  description?: string | null;
  posterImageUrl?: string | null;
  posterImageKey?: string | null;
  posterCropData?: string | null;
  soundId?: number | null;
  latitude?: string | null;
  longitude?: string | null;
  locationLinkUrl?: string | null;
  status: "default" | "queued" | "done";
  categoryIds?: number[];
  subcategoryIds?: number[];
}

interface ContentCardProps {
  item: ContentItem;
  categoryName?: string;
  isSelectMode?: boolean;
  selected?: boolean;
  onPress: () => void;
  onUpdateStatus?: (status: "default" | "queued" | "done") => void;
  onRemoveFromCategory?: () => void;
  onRemoveFromSubcategory?: () => void;
  onCategorize?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ContentCard({
  item,
  categoryName,
  isSelectMode,
  selected,
  onPress,
  onUpdateStatus,
  onRemoveFromCategory,
  onRemoveFromSubcategory,
  onCategorize,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ContentCardProps) {
  const { colors, theme } = useTheme();
  const [aspectRatio, setAspectRatio] = useState<number>(3 / 4);
  const { dialogState, hide, showConfirm } = useAppDialog();
  const lastMenuActionTime = useRef(0);

  const isQueued = item.status === "queued";
  const isDone = item.status === "done";

  const handleConfirmDelete = () => {
    lastMenuActionTime.current = Date.now();
    showConfirm({
      title: "Delete this item?",
      message: "This action cannot be undone. This will permanently delete the content.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: onDelete,
    });
  };

  const handleConfirmRemoveCategory = () => {
    lastMenuActionTime.current = Date.now();
    showConfirm({
      title: "Remove from category?",
      message: "Are you sure you want to remove this item from this category? It will still be available in your other categories.",
      confirmText: "Remove",
      destructive: true,
      onConfirm: onRemoveFromCategory,
    });
  };

  const handleConfirmRemoveSubcategory = () => {
    lastMenuActionTime.current = Date.now();
    showConfirm({
      title: "Remove from subcategory?",
      message: "Are you sure you want to remove this item from this subcategory. It will still be available in your other categories.",
      confirmText: "Remove",
      destructive: true,
      onConfirm: onRemoveFromSubcategory,
    });
  };

  // Menu items for this specific card
  const menuItems = [
    ...(onUpdateStatus
      ? [
          {
            label: isQueued ? "Unqueue" : "Queue",
            icon: Clock,
            onPress: () => {
              lastMenuActionTime.current = Date.now();
              onUpdateStatus(isQueued ? "default" : "queued");
            },
          },
          {
            label: isDone ? "Undone" : "Done",
            icon: CheckCircle2,
            onPress: () => {
              lastMenuActionTime.current = Date.now();
              onUpdateStatus(isDone ? "default" : "done");
            },
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            label: "Edit Details",
            icon: Pencil,
            onPress: () => {
              lastMenuActionTime.current = Date.now();
              onEdit();
            },
          },
        ]
      : []),
    ...(onMoveUp
      ? [
          {
            label: "Move Up",
            icon: ArrowUp,
            onPress: () => {
              lastMenuActionTime.current = Date.now();
              onMoveUp();
            },
          },
        ]
      : []),
    ...(onMoveDown
      ? [
          {
            label: "Move Down",
            icon: ArrowDown,
            onPress: () => {
              lastMenuActionTime.current = Date.now();
              onMoveDown();
            },
          },
        ]
      : []),
    ...(onRemoveFromCategory
      ? [
          {
            label: "Remove from Category",
            icon: FolderMinus,
            onPress: handleConfirmRemoveCategory,
          },
        ]
      : []),
    ...(onRemoveFromSubcategory
      ? [
          {
            label: "Remove from Subcategory",
            icon: FolderMinus,
            onPress: handleConfirmRemoveSubcategory,
          },
        ]
      : []),
    ...(onCategorize
      ? [
          {
            label: "Categorize content",
            icon: FolderPlus,
            onPress: () => {
              lastMenuActionTime.current = Date.now();
              onCategorize();
            },
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onPress: handleConfirmDelete,
          },
        ]
      : []),
  ];

  const handleCardPress = () => {
    if (Date.now() - lastMenuActionTime.current < 450) {
      return;
    }
    onPress?.();
  };

  return (
    <>
      <Pressable
      onPress={handleCardPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor:
            theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.8)",
          borderColor: selected
            ? "#3B82F6"
            : theme === "dark"
            ? "rgba(255, 255, 255, 0.12)"
            : "rgba(0, 0, 0, 0.08)",
          borderWidth: selected ? 2 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Selection checkbox */}
      {isSelectMode && (
        <View style={styles.selectionCheckbox}>
          <View
            style={[
              styles.checkboxBox,
              selected
                ? { backgroundColor: "#3B82F6", borderColor: "#3B82F6" }
                : { backgroundColor: "rgba(0, 0, 0, 0.45)", borderColor: "rgba(255, 255, 255, 0.4)" },
            ]}
          >
            <CheckCircle2
              size={14}
              color={selected ? "#FFFFFF" : "transparent"}
            />
          </View>
        </View>
      )}

      {/* Poster Image Container */}
      {item.posterImageUrl ? (
        <View style={[styles.imageWrapper, aspectRatio ? { aspectRatio } : undefined]}>
          <Image
            source={{ uri: item.posterImageUrl }}
            style={aspectRatio ? StyleSheet.absoluteFill : styles.naturalImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onLoad={(e) => {
              if (e.source.width && e.source.height) {
                setAspectRatio(e.source.width / e.source.height);
              }
            }}
          />

          {/* Status badge on image */}
          {!isSelectMode && item.status !== "default" && (
            <View style={styles.statusPill}>
              {isQueued && (
                <View style={[styles.badge, { backgroundColor: "rgba(59, 130, 246, 0.85)" }]}>
                  <Clock size={10} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Queued</Text>
                </View>
              )}
              {isDone && (
                <View style={[styles.badge, { backgroundColor: "rgba(16, 185, 129, 0.85)" }]}>
                  <CheckCircle2 size={10} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Done</Text>
                </View>
              )}
            </View>
          )}

          {/* 3-dot menu button on image */}
          {!isSelectMode && menuItems.length > 0 && (
            <View style={styles.moreBtnWrapper}>
              <DropdownMenu
                align="right"
                trigger={(open) => (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      lastMenuActionTime.current = Date.now();
                      open();
                    }}
                    style={styles.moreBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MoreVertical size={14} color="rgba(255, 255, 255, 0.85)" />
                  </Pressable>
                )}
                items={menuItems}
              />
            </View>
          )}
        </View>
      ) : (
        /* No image - show colored block matching web */
        <View style={[styles.noImageBlock, { backgroundColor: colors.surface }]}>
          {item.status !== "default" && (
            <View style={styles.noImageStatusPill}>
              {isQueued && (
                <View style={[styles.badge, { backgroundColor: "rgba(59, 130, 246, 0.3)" }]}>
                  <Clock size={10} color="#3B82F6" />
                  <Text style={[styles.badgeText, { color: "#3B82F6" }]}>Queued</Text>
                </View>
              )}
              {isDone && (
                <View style={[styles.badge, { backgroundColor: "rgba(16, 185, 129, 0.3)" }]}>
                  <CheckCircle2 size={10} color="#10B981" />
                  <Text style={[styles.badgeText, { color: "#10B981" }]}>Done</Text>
                </View>
              )}
            </View>
          )}

          {!isSelectMode && menuItems.length > 0 && (
            <View style={styles.moreBtnWrapper}>
              <DropdownMenu
                align="right"
                trigger={(open) => (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      lastMenuActionTime.current = Date.now();
                      open();
                    }}
                    style={styles.moreBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MoreVertical size={14} color={colors.textMuted} />
                  </Pressable>
                )}
                items={menuItems}
              />
            </View>
          )}
        </View>
      )}

      {/* Info Container */}
      <View style={styles.content}>
        {categoryName ? (
          <Text style={[styles.categoryTag, { color: colors.textSubtle }]} numberOfLines={1}>
            {categoryName}
          </Text>
        ) : null}

        <Text style={[styles.heading, { color: colors.text }]} numberOfLines={3}>
          {item.heading}
        </Text>

        {item.description ? (
          <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
    <AppDialogRenderer {...dialogState} onHide={hide} />
  </>
);
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    ...Platform.select({
      web: {
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
        cursor: "pointer",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  selectionCheckbox: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 25,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    position: "relative",
    overflow: "hidden",
    minHeight: 120,
  },
  naturalImage: {
    width: "100%",
    minHeight: 120,
  },
  noImageBlock: {
    width: "100%",
    height: 80,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageStatusPill: {
    alignSelf: "center",
  },
  statusPill: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },
  moreBtnWrapper: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 15,
  },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 11,
    gap: 4,
  },
  categoryTag: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heading: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
});
