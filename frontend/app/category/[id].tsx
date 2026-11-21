import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  MoreHorizontal,
  X,
  PlusCircle,
  FilePlus,
  FolderMinus,
  ListChecks,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CATEGORY_IMAGES } from "../../src/lib/constants";
import { ContentCard, type ContentItem } from "../../src/components/ContentCard";
import { SubcategoryCard } from "../../src/components/SubcategoryCard";
import { ContentDetailModal } from "../../src/components/ContentDetailModal";
import { EditCategoryModal } from "../../src/components/EditCategoryModal";
import { EditSubcategoryModal } from "../../src/components/EditSubcategoryModal";
import { EditContentModal } from "../../src/components/EditContentModal";
import { AddSubcategoryModal } from "../../src/components/AddSubcategoryModal";
import { AddContentModal } from "../../src/components/AddContentModal";
import { DropdownMenu } from "../../src/components/DropdownMenu";
import { AppDialogRenderer, useAppDialog } from "../../src/components/AppDialog";

const DEFAULT_BG =
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80";

export default function CategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { dialogState, hide, showConfirm } = useAppDialog();
  const { id, status } = useLocalSearchParams<{ id: string; status?: string }>();
  const categoryId = parseInt(id || "0", 10);
  const statusFilter = status as "default" | "queued" | "done" | undefined;
  const utils = trpc.useUtils();

  // Search mode state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selection mode states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<Set<number>>(new Set());

  const [isSubcategorySelectMode, setIsSubcategorySelectMode] = useState(false);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<number>>(new Set());

  // Slide-to-select touch handling
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isSelectMode && !isSubcategorySelectMode) return;

    let touchedInSession = new Set<number>();

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = el?.closest("[data-item-id]") as HTMLElement | null;
      if (card) {
        const itemId = parseInt(card.dataset.itemId || "0", 10);
        const itemType = card.dataset.itemType;
        if (!itemId || touchedInSession.has(itemId)) return;

        touchedInSession.add(itemId);

        if (itemType === "content" && isSelectMode) {
          setSelectedContentIds((curr) => {
            const updated = new Set(curr);
            if (updated.has(itemId)) updated.delete(itemId);
            else updated.add(itemId);
            return updated;
          });
        } else if (itemType === "subcategory" && isSubcategorySelectMode) {
          setSelectedSubcategoryIds((curr) => {
            const updated = new Set(curr);
            if (updated.has(itemId)) updated.delete(itemId);
            else updated.add(itemId);
            return updated;
          });
        }
      }
    };

    const handleTouchEnd = () => {
      touchedInSession = new Set();
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSelectMode, isSubcategorySelectMode]);

  // Modals state
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [activeSubcategoryForEdit, setActiveSubcategoryForEdit] = useState<any | null>(null);

  // Content detail viewer state
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const [activeEditItem, setActiveEditItem] = useState<ContentItem | null>(null);

  // Queries
  const { data: category, isLoading: catLoading } =
    trpc.categories.getById.useQuery({ categoryId });

  const { data: subcategories = [], isLoading: subsLoading } =
    trpc.subcategories.list.useQuery({ categoryId });

  const { data: subcategoryCounts } =
    trpc.subcategories.getContentCounts.useQuery(
      { categoryId },
      { enabled: !!categoryId }
    );

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch,
    isRefetching,
  } = trpc.content.listByCategory.useQuery({ categoryId });

  // Mutations
  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      router.back();
    },
  });

  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate({ categoryId });
      utils.subcategories.getContentCounts.invalidate({ categoryId });
    },
  });

  const reorderSubMutation = trpc.subcategories.reorder.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate({ categoryId });
    },
  });

  const reorderContentMutation = trpc.content.reorderInCategory.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate({ categoryId });
    },
  });

  const handleMoveSubcategory = (subId: number, direction: "up" | "down") => {
    const currentIndex = subcategories.findIndex((s) => s.id === subId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= subcategories.length) return;

    const newOrder = [...subcategories];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    utils.subcategories.list.setData({ categoryId }, newOrder);

    reorderSubMutation.mutate(
      { categoryId, subcategoryIds: newOrder.map((s) => s.id) },
      {
        onError: () => {
          utils.subcategories.list.invalidate({ categoryId });
        },
      }
    );
  };

  const handleMoveContent = (contentId: number, direction: "up" | "down") => {
    const currentIndex = items.findIndex((it) => it.id === contentId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newOrder = [...items];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    utils.content.listByCategory.setData({ categoryId }, newOrder);

    reorderContentMutation.mutate(
      { categoryId, contentIds: newOrder.map((it) => it.id) },
      {
        onError: () => {
          utils.content.listByCategory.invalidate({ categoryId });
        },
      }
    );
  };

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate({ categoryId });
      utils.content.listByStatus.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate({ categoryId });
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();
    },
  });

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate({ categoryId });
    },
  });

  const batchRemoveFromCategory = trpc.content.batchRemoveFromCategory.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate({ categoryId });
      setIsSelectMode(false);
      setSelectedContentIds(new Set());
    },
  });

  const bgImage =
    category?.coverImageUrl ||
    (category?.name ? CATEGORY_IMAGES[category.name] : null) ||
    DEFAULT_BG;

  const statusFilteredItems = useMemo(() => {
    if (!statusFilter) return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const statusFilteredSubcategories = useMemo(() => {
    if (!statusFilter || !items) return subcategories;
    const subIdsWithStatus = new Set(
      items.filter((item) => item.status === statusFilter)
           .flatMap((item: any) => item.subcategoryIds || [])
    );
    return subcategories.filter((sub) => subIdsWithStatus.has(sub.id));
  }, [subcategories, items, statusFilter]);

  // Filtered lists based on search
  const displayedSubcategories = useMemo(() => {
    if (!searchQuery.trim()) return statusFilteredSubcategories;
    const q = searchQuery.toLowerCase();
    return statusFilteredSubcategories.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [statusFilteredSubcategories, searchQuery]);

  const displayedContent = useMemo(() => {
    if (!searchQuery.trim()) return statusFilteredItems;
    const q = searchQuery.toLowerCase();
    return statusFilteredItems.filter(
      (item) =>
        item.heading.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [statusFilteredItems, searchQuery]);

  // Hierarchy 1: Category Header Dropdown Menu Items
  const categoryMenuItems = [
    {
      label: "Add Content",
      icon: FilePlus,
      onPress: () => setShowAddContentModal(true),
    },
    {
      label: "Add Subcategory",
      icon: PlusCircle,
      onPress: () => setShowAddSubModal(true),
    },
    {
      label: "Remove Subcategories",
      icon: FolderMinus,
      disabled: subcategories.length === 0,
      onPress: () => setIsSubcategorySelectMode(true),
    },
    {
      label: "Edit Details",
      icon: Pencil,
      onPress: () => setShowEditCategoryModal(true),
    },
    {
      label: "Delete Category",
      icon: Trash2,
      destructive: true,
      onPress: () => {
        showConfirm({
          title: "Delete this category?",
          message: "This will permanently delete the category and all its contents.",
          confirmText: "Delete",
          destructive: true,
          onConfirm: () => deleteCategory.mutate({ categoryId }),
        });
      },
    },
  ];

  // Hierarchy 2: Content Section Header Dropdown Menu Items
  const contentSectionMenuItems = [
    {
      label: "Add Content",
      icon: FilePlus,
      onPress: () => setShowAddContentModal(true),
    },
    {
      label: "Remove Contents",
      icon: ListChecks,
      disabled: items.length === 0,
      onPress: () => setIsSelectMode(true),
    },
  ];

  // Batch action handlers
  const handleBatchDeleteSubcategories = () => {
    if (selectedSubcategoryIds.size === 0) return;
    showConfirm({
      title: `Delete ${selectedSubcategoryIds.size} subcategor${selectedSubcategoryIds.size === 1 ? "y" : "ies"}?`,
      message: "This action cannot be undone. All linked content will be unlinked.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: async () => {
        for (const subId of Array.from(selectedSubcategoryIds)) {
          await deleteSubcategory.mutateAsync({ subcategoryId: subId });
        }
        setIsSubcategorySelectMode(false);
        setSelectedSubcategoryIds(new Set());
      },
    });
  };

  const handleBatchRemoveContents = () => {
    if (selectedContentIds.size === 0) return;
    showConfirm({
      title: `Remove ${selectedContentIds.size} items?`,
      message: "Are you sure you want to remove these items from this category?",
      confirmText: "Remove",
      destructive: true,
      onConfirm: () => {
        batchRemoveFromCategory.mutate({
          categoryId,
          itemIds: Array.from(selectedContentIds),
        });
      },
    });
  };

  const handleRemoveItemFromCategory = (item: ContentItem) => {
    updateContent.mutate({
      itemId: item.id,
      categoryIds: (item.categoryIds || []).filter((id) => id !== categoryId),
      subcategoryIds: item.subcategoryIds,
    });
  };

  const isLoading = catLoading || subsLoading || itemsLoading;

  return (
    <View style={styles.container}>
      {/* Full-screen blurred background image matching web */}
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={Platform.OS !== "web" ? 25 : undefined}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropOverlay,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(10, 10, 10, 0.65)"
                : "rgba(255, 255, 255, 0.65)",
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 24 : 12),
            paddingBottom: insets.bottom + 120,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); }}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthWrapper}>
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={16} color={colors.textMuted} />
            <Text style={[styles.backButtonText, { color: colors.textMuted }]}>
              Back
            </Text>
          </Pressable>

          {/* Header row / Search row */}
          {isSearchMode ? (
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Search size={16} color="rgba(255, 255, 255, 0.5)" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search in this category..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <X size={16} color="rgba(255, 255, 255, 0.5)" />
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={() => {
                  setIsSearchMode(false);
                  setSearchQuery("");
                }}
                style={styles.cancelSearchBtn}
              >
                <Text style={styles.cancelSearchText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {category?.name || "Category"}
              </Text>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => setIsSearchMode(true)}
                  style={styles.iconCircleBtn}
                >
                  <Search size={18} color={colors.text} />
                </Pressable>

                {/* Hierarchy 1: Category Header 3-dotted Dropdown Menu */}
                <DropdownMenu
                  align="right"
                  trigger={(open) => (
                    <Pressable onPress={open} style={styles.iconCircleBtn}>
                      <MoreHorizontal size={18} color={colors.text} />
                    </Pressable>
                  )}
                  items={categoryMenuItems}
                />
              </View>
            </View>
          )}

          {/* Category description & counts */}
          {!isSearchMode && (
            <View style={styles.categoryMeta}>
              {statusFilter && (
                <View style={styles.filterBadgeRow}>
                  <View
                    style={[
                      styles.filterBadgeDot,
                      { backgroundColor: statusFilter === "queued" ? "#3B82F6" : "#10B981" },
                    ]}
                  />
                  <Text style={styles.filterBadgeText}>
                    FILTERING BY: {statusFilter.toUpperCase()}
                  </Text>
                </View>
              )}
              {category?.description ? (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {category.description}
                </Text>
              ) : null}
              <Text style={[styles.countLine, { color: colors.textSubtle }]}>
                {displayedContent.length} item{displayedContent.length !== 1 ? "s" : ""}
                {statusFilter ? " shown" : ""}
                {displayedSubcategories.length > 0 ? ` · ${displayedSubcategories.length} subcategories` : ""}
              </Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : (
            <>
              {/* SUBCATEGORIES 2-COLUMN MASONRY GRID */}
              {displayedSubcategories.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>
                    SUBCATEGORIES
                  </Text>
                  <View style={styles.twoColumnGrid}>
                    {/* Left Column */}
                    <View style={styles.gridColumn}>
                      {displayedSubcategories
                        .filter((_, i) => i % 2 === 0)
                        .map((sub) => (
                          <View
                            key={sub.id}
                            {...({ "data-item-id": sub.id, "data-item-type": "subcategory" } as any)}
                          >
                            <SubcategoryCard
                              subcategory={sub}
                              count={subcategoryCounts?.[sub.id] || 0}
                              isSelectMode={isSubcategorySelectMode}
                              selected={selectedSubcategoryIds.has(sub.id)}
                              onPress={() => {
                                if (isSubcategorySelectMode) {
                                  const newSet = new Set(selectedSubcategoryIds);
                                  if (newSet.has(sub.id)) newSet.delete(sub.id);
                                  else newSet.add(sub.id);
                                  setSelectedSubcategoryIds(newSet);
                                } else {
                                  router.push(`/subcategory/${sub.id}${statusFilter ? `?status=${statusFilter}` : ""}`);
                                }
                              }}
                              onEdit={() => setActiveSubcategoryForEdit(sub)}
                              onDelete={() => deleteSubcategory.mutate({ subcategoryId: sub.id })}
                              onMoveUp={
                                subcategories.findIndex((s) => s.id === sub.id) > 0
                                  ? () => handleMoveSubcategory(sub.id, "up")
                                  : undefined
                              }
                              onMoveDown={
                                subcategories.findIndex((s) => s.id === sub.id) < subcategories.length - 1
                                  ? () => handleMoveSubcategory(sub.id, "down")
                                  : undefined
                              }
                            />
                          </View>
                        ))}
                    </View>
                    {/* Right Column */}
                    <View style={styles.gridColumn}>
                      {displayedSubcategories
                        .filter((_, i) => i % 2 === 1)
                        .map((sub) => (
                          <View
                            key={sub.id}
                            {...({ "data-item-id": sub.id, "data-item-type": "subcategory" } as any)}
                          >
                            <SubcategoryCard
                              subcategory={sub}
                              count={subcategoryCounts?.[sub.id] || 0}
                              isSelectMode={isSubcategorySelectMode}
                              selected={selectedSubcategoryIds.has(sub.id)}
                              onPress={() => {
                                if (isSubcategorySelectMode) {
                                  const newSet = new Set(selectedSubcategoryIds);
                                  if (newSet.has(sub.id)) newSet.delete(sub.id);
                                  else newSet.add(sub.id);
                                  setSelectedSubcategoryIds(newSet);
                                } else {
                                  router.push(`/subcategory/${sub.id}${statusFilter ? `?status=${statusFilter}` : ""}`);
                                }
                              }}
                              onEdit={() => setActiveSubcategoryForEdit(sub)}
                              onDelete={() => deleteSubcategory.mutate({ subcategoryId: sub.id })}
                              onMoveUp={
                                subcategories.findIndex((s) => s.id === sub.id) > 0
                                  ? () => handleMoveSubcategory(sub.id, "up")
                                  : undefined
                              }
                              onMoveDown={
                                subcategories.findIndex((s) => s.id === sub.id) < subcategories.length - 1
                                  ? () => handleMoveSubcategory(sub.id, "down")
                                  : undefined
                              }
                            />
                          </View>
                        ))}
                    </View>
                  </View>
                </View>
              )}

              {/* CONTENT 2-COLUMN MASONRY GRID */}
              {displayedContent.length > 0 ? (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: colors.textSubtle, marginBottom: 0 }]}>
                      CONTENT
                    </Text>

                    {/* Hierarchy 2: Content Section Header 3-dotted Dropdown Menu */}
                    <DropdownMenu
                      align="right"
                      trigger={(open) => (
                        <Pressable onPress={open} style={styles.smallCircleBtn}>
                          <MoreHorizontal size={14} color={colors.textMuted} />
                        </Pressable>
                      )}
                      items={contentSectionMenuItems}
                    />
                  </View>

                  <View style={styles.twoColumnGrid}>
                    {/* Left Column */}
                    <View style={styles.gridColumn}>
                      {displayedContent
                        .filter((_, i) => i % 2 === 0)
                        .map((item) => (
                          <View
                            key={item.id}
                            {...({ "data-item-id": item.id, "data-item-type": "content" } as any)}
                          >
                            <ContentCard
                              item={item as any}
                              isSelectMode={isSelectMode}
                              selected={selectedContentIds.has(item.id)}
                              onPress={() => {
                                if (isSelectMode) {
                                  const newSet = new Set(selectedContentIds);
                                  if (newSet.has(item.id)) newSet.delete(item.id);
                                  else newSet.add(item.id);
                                  setSelectedContentIds(newSet);
                                } else {
                                  setActiveItem(item as any);
                                }
                              }}
                              onUpdateStatus={(newStatus) =>
                                updateStatus.mutate({ itemId: item.id, status: newStatus })
                              }
                              onRemoveFromCategory={() => handleRemoveItemFromCategory(item as any)}
                              onEdit={() => setActiveEditItem(item as any)}
                              onDelete={() => deleteItem.mutate({ itemId: item.id })}
                              onMoveUp={
                                items.findIndex((it) => it.id === item.id) > 0
                                  ? () => handleMoveContent(item.id, "up")
                                  : undefined
                              }
                              onMoveDown={
                                items.findIndex((it) => it.id === item.id) < items.length - 1
                                  ? () => handleMoveContent(item.id, "down")
                                  : undefined
                              }
                            />
                          </View>
                        ))}
                    </View>
                    {/* Right Column */}
                    <View style={styles.gridColumn}>
                      {displayedContent
                        .filter((_, i) => i % 2 === 1)
                        .map((item) => (
                          <View
                            key={item.id}
                            {...({ "data-item-id": item.id, "data-item-type": "content" } as any)}
                          >
                            <ContentCard
                              item={item as any}
                              isSelectMode={isSelectMode}
                              selected={selectedContentIds.has(item.id)}
                              onPress={() => {
                                if (isSelectMode) {
                                  const newSet = new Set(selectedContentIds);
                                  if (newSet.has(item.id)) newSet.delete(item.id);
                                  else newSet.add(item.id);
                                  setSelectedContentIds(newSet);
                                } else {
                                  setActiveItem(item as any);
                                }
                              }}
                              onUpdateStatus={(newStatus) =>
                                updateStatus.mutate({ itemId: item.id, status: newStatus })
                              }
                              onRemoveFromCategory={() => handleRemoveItemFromCategory(item as any)}
                              onEdit={() => setActiveEditItem(item as any)}
                              onDelete={() => deleteItem.mutate({ itemId: item.id })}
                              onMoveUp={
                                items.findIndex((it) => it.id === item.id) > 0
                                  ? () => handleMoveContent(item.id, "up")
                                  : undefined
                              }
                              onMoveDown={
                                items.findIndex((it) => it.id === item.id) < items.length - 1
                                  ? () => handleMoveContent(item.id, "down")
                                  : undefined
                              }
                            />
                          </View>
                        ))}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
                    {searchQuery.trim().length > 0 ? "No matches found" : "No content in this category"}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSubtle }]}>
                    {searchQuery.trim().length > 0
                      ? "Try a different search term"
                      : "Add items from the + menu above to see them here"}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar for Content Selection Mode */}
      {isSelectMode && (
        <View style={styles.floatingBarContainer}>
          <View style={[styles.floatingBar, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
            <Text style={[styles.floatingCountText, { color: colors.text }]}>
              {selectedContentIds.size} selected
            </Text>
            <View style={styles.floatingActions}>
              <Pressable
                onPress={() => {
                  const allIds = new Set(displayedContent.map((c) => c.id));
                  setSelectedContentIds(allIds);
                }}
                style={styles.floatingActionBtn}
              >
                <Text style={styles.floatingActionBtnText}>Select All</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsSelectMode(false);
                  setSelectedContentIds(new Set());
                }}
                style={styles.floatingActionBtn}
              >
                <Text style={[styles.floatingActionBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleBatchRemoveContents}
                disabled={selectedContentIds.size === 0}
                style={[
                  styles.floatingDeleteBtn,
                  selectedContentIds.size === 0 && { opacity: 0.5 },
                ]}
              >
                <Trash2 size={14} color="#FFFFFF" />
                <Text style={styles.floatingDeleteBtnText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Floating Bottom Action Bar for Subcategory Selection Mode */}
      {isSubcategorySelectMode && (
        <View style={styles.floatingBarContainer}>
          <View style={[styles.floatingBar, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
            <Text style={[styles.floatingCountText, { color: colors.text }]}>
              {selectedSubcategoryIds.size} selected
            </Text>
            <View style={styles.floatingActions}>
              <Pressable
                onPress={() => {
                  const allIds = new Set(displayedSubcategories.map((s) => s.id));
                  setSelectedSubcategoryIds(allIds);
                }}
                style={styles.floatingActionBtn}
              >
                <Text style={styles.floatingActionBtnText}>Select All</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsSubcategorySelectMode(false);
                  setSelectedSubcategoryIds(new Set());
                }}
                style={styles.floatingActionBtn}
              >
                <Text style={[styles.floatingActionBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleBatchDeleteSubcategories}
                disabled={selectedSubcategoryIds.size === 0}
                style={[
                  styles.floatingDeleteBtn,
                  selectedSubcategoryIds.size === 0 && { opacity: 0.5 },
                ]}
              >
                <Trash2 size={14} color="#FFFFFF" />
                <Text style={styles.floatingDeleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Full-Screen Content Detail Viewer Modal */}
      <ContentDetailModal
        item={activeItem}
        visible={!!activeItem}
        activeCategoryId={categoryId}
        onClose={() => setActiveItem(null)}
        onRemoveFromCategory={() => {
          if (activeItem) handleRemoveItemFromCategory(activeItem);
        }}
      />

      {/* Edit Content Modal - opened from card 3-dot menu */}
      <EditContentModal
        item={activeEditItem}
        visible={!!activeEditItem}
        onClose={() => setActiveEditItem(null)}
        onSaved={() => {
          utils.content.listByCategory.invalidate({ categoryId });
          utils.content.listByStatus.invalidate();
          if (activeEditItem?.id) utils.content.getById.invalidate({ itemId: activeEditItem.id });
        }}
      />

      {/* Edit Category Modal */}
      <EditCategoryModal
        category={category as any}
        visible={showEditCategoryModal}
        onClose={() => setShowEditCategoryModal(false)}
      />

      {/* Add Subcategory Modal */}
      <AddSubcategoryModal
        categoryId={categoryId}
        visible={showAddSubModal}
        onClose={() => setShowAddSubModal(false)}
      />

      {/* Add Content Modal */}
      <AddContentModal
        visible={showAddContentModal}
        initialCategoryId={categoryId}
        onClose={() => setShowAddContentModal(false)}
      />

      {/* Edit Subcategory Modal */}
      <EditSubcategoryModal
        subcategory={activeSubcategoryForEdit}
        visible={!!activeSubcategoryForEdit}
        onClose={() => setActiveSubcategoryForEdit(null)}
      />

      <AppDialogRenderer {...dialogState} onHide={hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  backdropOverlay: {
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      } as any,
    }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 672,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    flex: 1,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryMeta: {
    marginBottom: 20,
    gap: 4,
  },
  filterBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 6,
  },
  filterBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "rgba(255, 255, 255, 0.7)",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  countLine: {
    fontSize: 13,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    width: "100%",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    height: "100%",
  },
  cancelSearchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  cancelSearchText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  smallCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    width: "100%",
  },
  gridColumn: {
    flex: 1,
    minWidth: 0,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 13,
  },
  // Floating Action Bar in select mode
  floatingBarContainer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99,
  },
  floatingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    width: "90%",
    maxWidth: 500,
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  floatingCountText: {
    fontSize: 14,
    fontWeight: "600",
  },
  floatingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  floatingActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  floatingActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  floatingDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  floatingDeleteBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
