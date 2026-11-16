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
  Pencil,
  Trash2,
} from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { ContentCard, type ContentItem } from "../../src/components/ContentCard";
import { ContentDetailModal } from "../../src/components/ContentDetailModal";

const FALLBACK_BG =
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80";

export default function SubcategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subcategoryId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();

  // Search mode state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit subcategory modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Content detail modal state
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);

  // Queries
  const { data: subcategory, isLoading: subLoading } =
    trpc.subcategories.getById.useQuery({ subcategoryId });

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch,
    isRefetching,
  } = trpc.content.listBySubcategory.useQuery({ subcategoryId });

  // Mutations
  const updateSubcategory = trpc.subcategories.update.useMutation({
    onSuccess: () => {
      utils.subcategories.getById.invalidate({ subcategoryId });
      setShowEditModal(false);
    },
  });

  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate();
      router.back();
    },
  });

  const bgImage = subcategory?.coverImageUrl || FALLBACK_BG;

  // Filtered contents based on search
  const displayedContent = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.heading.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const handleOptionsMenu = () => {
    Alert.alert("Subcategory Options", undefined, [
      {
        text: "Edit Subcategory",
        onPress: () => {
          setEditName(subcategory?.name || "");
          setEditDesc(subcategory?.description || "");
          setShowEditModal(true);
        },
      },
      {
        text: "Delete Subcategory",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Subcategory",
            "This will permanently delete this subcategory and unlink its contents.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteSubcategory.mutate({ subcategoryId }),
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
    updateSubcategory.mutate({
      subcategoryId,
      name: editName.trim(),
      description: editDesc.trim() || undefined,
    });
  };

  const isLoading = subLoading || itemsLoading;

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
                  placeholder="Search in this subcategory..."
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
                {subcategory?.name || "Subcategory"}
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

          {/* Subcategory description & counts */}
          {!isSearchMode && (
            <View style={styles.categoryMeta}>
              {subcategory?.description ? (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {subcategory.description}
                </Text>
              ) : null}
              <Text style={[styles.countLine, { color: colors.textSubtle }]}>
                {items.length} item{items.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : (
            <>
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
                    {searchQuery.trim().length > 0 ? "No matches found" : "No content in this subcategory"}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSubtle }]}>
                    {searchQuery.trim().length > 0
                      ? "Try a different search keyword"
                      : "Items linked to this subcategory will appear here"}
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

      {/* Edit Subcategory Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Subcategory</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Subcategory name"
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
              disabled={updateSubcategory.isPending}
              style={styles.modalSubmitBtn}
            >
              {updateSubcategory.isPending ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.modalSubmitText}>Save Changes</Text>
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
