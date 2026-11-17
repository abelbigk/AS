import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2,
  FolderMinus,
  Calendar,
  Images,
  Film,
} from "lucide-react-native";
import { format } from "date-fns";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { DropdownMenu } from "./DropdownMenu";
import { CroppedImage } from "./CroppedImage";
import { EditContentModal } from "./EditContentModal";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import type { ContentItem } from "./ContentCard";

interface ContentDetailModalProps {
  item: ContentItem | null;
  visible: boolean;
  activeCategoryId?: number;
  activeSubcategoryId?: number;
  onClose: () => void;
  onDeleted?: () => void;
  onRemoveFromCategory?: () => void;
  onRemoveFromSubcategory?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ContentDetailModal({
  item,
  visible,
  activeCategoryId,
  activeSubcategoryId,
  onClose,
  onDeleted,
  onRemoveFromCategory,
  onRemoveFromSubcategory,
}: ContentDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { dialogState, hide, showConfirm } = useAppDialog();
  const utils = trpc.useUtils();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Re-fetch item to keep it fresh
  const { data: freshItem } = trpc.content.getById.useQuery(
    { itemId: item?.id || 0 },
    { enabled: !!item?.id && visible }
  );
  const displayItem = freshItem || item;

  // Fetch attached media items
  const { data: mediaItems = [], isLoading: mediaLoading } =
    trpc.media.listByContent.useQuery(
      { contentItemId: item?.id || 0 },
      { enabled: !!item?.id && visible }
    );

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listByStatus.invalidate();
      if (item?.id) utils.content.getById.invalidate({ itemId: item.id });
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();
      onDeleted?.();
      onClose();
    },
  });

  if (!displayItem) return null;

  const isQueued = displayItem.status === "queued";
  const isDone = displayItem.status === "done";

  const handleToggleQueue = () => {
    updateStatus.mutate({
      itemId: displayItem.id,
      status: isQueued ? "default" : "queued",
    });
  };

  const handleToggleDone = () => {
    updateStatus.mutate({
      itemId: displayItem.id,
      status: isDone ? "default" : "done",
    });
  };

  const handleDelete = () => {
    showConfirm({
      title: "Delete this item?",
      message: "This action cannot be undone. This will permanently delete the content.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => deleteItem.mutate({ itemId: displayItem.id }),
    });
  };

  const handleRemoveCategory = () => {
    showConfirm({
      title: "Remove from category?",
      message: "Are you sure you want to remove this item from this category? It will still be available in your other categories.",
      confirmText: "Remove",
      destructive: true,
      onConfirm: () => {
        if (onRemoveFromCategory) {
          onRemoveFromCategory();
        }
        onClose();
      },
    });
  };

  const handleRemoveSubcategory = () => {
    showConfirm({
      title: "Remove from subcategory?",
      message: "Are you sure you want to remove this item from this subcategory? It will still be available in your other categories.",
      confirmText: "Remove",
      destructive: true,
      onConfirm: () => {
        if (onRemoveFromSubcategory) {
          onRemoveFromSubcategory();
        }
        onClose();
      },
    });
  };

  const menuItems = [
    {
      label: isQueued ? "Unqueue" : "Queue",
      icon: Clock,
      onPress: handleToggleQueue,
    },
    {
      label: isDone ? "Undone" : "Done",
      icon: CheckCircle2,
      onPress: handleToggleDone,
    },
    {
      label: "Edit Details",
      icon: Pencil,
      onPress: () => setEditModalOpen(true),
    },
    ...(activeCategoryId || onRemoveFromCategory
      ? [
          {
            label: "Remove from Category",
            icon: FolderMinus,
            onPress: handleRemoveCategory,
          },
        ]
      : []),
    ...(activeSubcategoryId || onRemoveFromSubcategory
      ? [
          {
            label: "Remove from Subcategory",
            icon: FolderMinus,
            onPress: handleRemoveSubcategory,
          },
        ]
      : []),
    {
      label: "Delete Content",
      icon: Trash2,
      destructive: true,
      onPress: handleDelete,
    },
  ];

  const sliderWidth = Math.min(SCREEN_WIDTH - 32, 640);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme === "dark" ? "#0A0A0A" : "#F8FAFC",
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Top Bar matching web */}
          <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={styles.backBtn} hitSlop={8}>
              <ArrowLeft size={18} color={colors.text} />
              <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
            </Pressable>

            <View style={styles.centerStatus}>
              {isQueued && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: "rgba(59, 130, 246, 0.2)",
                      borderColor: "rgba(59, 130, 246, 0.3)",
                    },
                  ]}
                >
                  <Clock size={11} color="#3B82F6" />
                  <Text style={[styles.statusBadgeText, { color: "#3B82F6" }]}>Queued</Text>
                </View>
              )}
              {isDone && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      borderColor: "rgba(16, 185, 129, 0.3)",
                    },
                  ]}
                >
                  <CheckCircle2 size={11} color="#10B981" />
                  <Text style={[styles.statusBadgeText, { color: "#10B981" }]}>Done</Text>
                </View>
              )}
            </View>

            <DropdownMenu
              align="right"
              trigger={(open) => (
                <Pressable onPress={open} style={styles.menuCircleBtn} hitSlop={8}>
                  <MoreVertical size={18} color={colors.text} />
                </Pressable>
              )}
              items={menuItems}
            />
          </View>

          {/* Scrollable Viewer Body */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.maxWidthWrapper}>
              {/* Heading */}
              <Text style={[styles.heading, { color: colors.text }]}>
                {displayItem.heading}
              </Text>

              {/* Created Date */}
              {(displayItem as any).createdAt && (
                <View style={styles.dateRow}>
                  <Calendar size={13} color={colors.textSubtle} />
                  <Text style={[styles.dateText, { color: colors.textSubtle }]}>
                    {format(new Date((displayItem as any).createdAt), "PPP")}
                  </Text>
                </View>
              )}

              {/* Description */}
              {displayItem.description ? (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {displayItem.description}
                </Text>
              ) : null}

              {/* Cover Poster Image */}
              {displayItem.posterImageUrl ? (
                <View style={styles.posterContainer}>
                  <CroppedImage
                    src={displayItem.posterImageUrl}
                    cropData={displayItem.posterCropData}
                    containerStyle={styles.posterImageWrapper}
                  />
                </View>
              ) : null}

              {/* Media Section */}
              <View style={styles.mediaSection}>
                <View style={styles.mediaSectionHeader}>
                  <Images size={14} color={colors.textSubtle} />
                  <Text style={[styles.mediaSectionTitle, { color: colors.textSubtle }]}>
                    Media · {mediaLoading ? "…" : `${mediaItems.length} item${mediaItems.length !== 1 ? "s" : ""}`}
                  </Text>
                </View>

                {mediaLoading ? (
                  <View style={[styles.mediaBoxPlaceholder, { borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                ) : mediaItems.length > 0 ? (
                  <View style={styles.mediaSliderContainer}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={(e) => {
                        const page = Math.round(
                          e.nativeEvent.contentOffset.x / sliderWidth
                        );
                        setActiveMediaIndex(page);
                      }}
                      style={{ width: sliderWidth }}
                    >
                      {mediaItems.map((m) => (
                        <View
                          key={m.id}
                          style={[
                            styles.slideWrapper,
                            { width: sliderWidth },
                          ]}
                        >
                          <Image
                            source={{ uri: m.url }}
                            style={styles.slideImage}
                            contentFit="contain"
                          />
                          {m.type === "video" && (
                            <View style={styles.slideVideoOverlay}>
                              <Film size={28} color="#FFFFFF" />
                              <Text style={styles.slideVideoText}>Video</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </ScrollView>

                    {/* Pagination indicator dots */}
                    {mediaItems.length > 1 && (
                      <View style={styles.paginationDots}>
                        {mediaItems.map((_, i) => (
                          <View
                            key={`dot-${i}`}
                            style={[
                              styles.dot,
                              {
                                backgroundColor:
                                  i === activeMediaIndex ? colors.text : colors.textSubtle,
                                opacity: i === activeMediaIndex ? 1 : 0.4,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.mediaEmptyBox, { borderColor: colors.border }]}>
                    <Images size={24} color={colors.textSubtle} />
                    <Text style={[styles.mediaEmptyText, { color: colors.textSubtle }]}>
                      No media here
                    </Text>
                  </View>
                )}
              </View>

              {/* Status Action Buttons */}
              <View style={styles.bottomActionsRow}>
                <Pressable
                  onPress={handleToggleQueue}
                  style={[
                    styles.statusActionButton,
                    isQueued
                      ? {
                          backgroundColor: "rgba(59, 130, 246, 0.2)",
                          borderColor: "#3B82F6",
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <Clock size={16} color={isQueued ? "#3B82F6" : colors.textMuted} />
                  <Text
                    style={[
                      styles.statusActionText,
                      { color: isQueued ? "#3B82F6" : colors.text },
                    ]}
                  >
                    {isQueued ? "Queued" : "Queue"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleToggleDone}
                  style={[
                    styles.statusActionButton,
                    isDone
                      ? {
                          backgroundColor: "rgba(16, 185, 129, 0.2)",
                          borderColor: "#10B981",
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <CheckCircle2
                    size={16}
                    color={isDone ? "#10B981" : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.statusActionText,
                      { color: isDone ? "#10B981" : colors.text },
                    ]}
                  >
                    {isDone ? "Completed" : "Done"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Content Modal */}
      <EditContentModal
        item={displayItem as any}
        visible={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => {
          if (item?.id) utils.content.getById.invalidate({ itemId: item.id });
        }}
      />
      <AppDialogRenderer {...dialogState} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
  },
  centerStatus: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  menuCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 672,
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  posterContainer: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    marginBottom: 24,
  },
  posterImageWrapper: {
    width: "100%",
    height: 320,
  },
  mediaSection: {
    marginBottom: 28,
  },
  mediaSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  mediaSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mediaBoxPlaceholder: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaSliderContainer: {
    alignItems: "center",
  },
  slideWrapper: {
    height: 320,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    position: "relative",
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  slideVideoOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  slideVideoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mediaEmptyBox: {
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mediaEmptyText: {
    fontSize: 13,
  },
  bottomActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statusActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
