import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
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
  Pencil,
  Trash2,
  Check,
} from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CATEGORY_IMAGES } from "../../src/lib/constants";
import { ContentCard, type ContentItem } from "../../src/components/ContentCard";
import { SubcategoryCard } from "../../src/components/SubcategoryCard";
import { ContentDetailModal } from "../../src/components/ContentDetailModal";

const DEFAULT_BG =
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80";

export default function CategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();

  // Search mode state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit category modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Add subcategory modal state
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [subName, setSubName] = useState("");
  const [subDesc, setSubDesc] = useState("");

  // Content detail modal state
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);

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
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.getById.invalidate({ categoryId });
      utils.categories.list.invalidate();
      setShowEditModal(false);
    },
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      router.back();
    },
  });

  const createSubcategory = trpc.subcategories.create.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate({ categoryId });
      setSubName("");
      setSubDesc("");
      setShowAddSubModal(false);
    },
  });

  const bgImage =
    category?.coverImageUrl ||
    (category?.name ? CATEGORY_IMAGES[category.name] : null) ||
    DEFAULT_BG;

  // Filtered lists based on search
  const displayedSubcategories = useMemo(() => {
    if (!searchQuery.trim()) return subcategories;
    const q = searchQuery.toLowerCase();
    return subcategories.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subcategories, searchQuery]);

  const displayedContent = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.heading.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Options menu
  const handleOptionsMenu = () => {
    Alert.alert("Category Options", undefined, [
      {
        text: "Add Subcategory",
        onPress: () => setShowAddSubModal(true),
      },
      {
        text: "Edit Category",
        onPress: () => {
          setEditName(category?.name || "");
          setEditDesc(category?.description || "");
          setShowEditModal(true);
        },
      },
      {
        text: "Delete Category",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Category",
            "This will permanently delete the category and unlink all contents.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteCategory.mutate({ categoryId }),
              },
            ]
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    updateCategory.mutate({
      categoryId,
      name: editName.trim(),
      description: editDesc.trim() || undefined,
    });
  };

  const handleCreateSubcategory = () => {
    if (!subName.trim()) return;
    createSubcategory.mutate({
      categoryId,
      name: subName.trim(),
      description: subDesc.trim() || undefined,
    });
  };

  const isLoading = catLoading || subsLoading || itemsLoading;

  return (
    <View style={styles.container}>
      {/* Full-screen blurred background image */}
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
            paddingBottom: insets.bottom + 100,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
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
                <Pressable
                  onPress={handleOptionsMenu}
                  style={styles.iconCircleBtn}
                >
                  <MoreHorizontal size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Category description & counts */}
          {!isSearchMode && (
            <View style={styles.categoryMeta}>
              {category?.description ? (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {category.description}
                </Text>
              ) : null}
              <Text style={[styles.countLine, { color: colors.textSubtle }]}>
                {items.length} item{items.length !== 1 ? "s" : ""}
                {subcategories.length > 0 ? ` · ${subcategories.length} subcategories` : ""}
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
                          <SubcategoryCard
                            key={sub.id}
                            subcategory={sub}
                            count={subcategoryCounts?.[sub.id] || 0}
                            onPress={() => router.push(`/subcategory/${sub.id}`)}
                          />
                        ))}
                    </View>
                    {/* Right Column */}
                    <View style={styles.gridColumn}>
                      {displayedSubcategories
                        .filter((_, i) => i % 2 === 1)
                        .map((sub) => (
                          <SubcategoryCard
                            key={sub.id}
                            subcategory={sub}
                            count={subcategoryCounts?.[sub.id] || 0}
                            onPress={() => router.push(`/subcategory/${sub.id}`)}
                          />
                        ))}
                    </View>
                  </View>
                </View>
              )}

              {/* CONTENT 2-COLUMN MASONRY GRID */}
              {displayedContent.length > 0 ? (
                <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>
                    CONTENT
                  </Text>
                  <View style={styles.twoColumnGrid}>
                    {/* Left Column */}
                    <View style={styles.gridColumn}>
                      {displayedContent
                        .filter((_, i) => i % 2 === 0)
                        .map((item) => (
                          <ContentCard
                            key={item.id}
                            item={item as any}
                            onPress={() => setActiveItem(item as any)}
                          />
                        ))}
                    </View>
                    {/* Right Column */}
                    <View style={styles.gridColumn}>
                      {displayedContent
                        .filter((_, i) => i % 2 === 1)
                        .map((item) => (
                          <ContentCard
                            key={item.id}
                            item={item as any}
                            onPress={() => setActiveItem(item as any)}
                          />
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
                      : "Add items from the + tab to see them here"}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Content Detail Viewer Modal */}
      <ContentDetailModal
        item={activeItem}
        visible={!!activeItem}
        onClose={() => setActiveItem(null)}
      />

      {/* Edit Category Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Category</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Category name"
              placeholderTextColor={colors.textSubtle}
              value={editName}
              onChangeText={setEditName}
            />

            <TextInput
              style={[styles.modalInput, styles.multilineInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSubtle}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              numberOfLines={3}
            />

            <Pressable
              onPress={handleSaveEdit}
              disabled={updateCategory.isPending}
              style={styles.modalSubmitBtn}
            >
              {updateCategory.isPending ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.modalSubmitText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal visible={showAddSubModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Subcategory</Text>
              <Pressable onPress={() => setShowAddSubModal(false)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Subcategory name"
              placeholderTextColor={colors.textSubtle}
              value={subName}
              onChangeText={setSubName}
            />

            <TextInput
              style={[styles.modalInput, styles.multilineInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSubtle}
              value={subDesc}
              onChangeText={setSubDesc}
              multiline
              numberOfLines={3}
            />

            <Pressable
              onPress={handleCreateSubcategory}
              disabled={createSubcategory.isPending}
              style={styles.modalSubmitBtn}
            >
              {createSubcategory.isPending ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.modalSubmitText}>Create Subcategory</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 2,
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  gridColumn: {
    flex: 1,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalInput: {
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  multilineInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  modalSubmitBtn: {
    backgroundColor: "#FFFFFF",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  modalSubmitText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
