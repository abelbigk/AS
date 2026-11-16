import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, MoreHorizontal, X, Check } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CATEGORY_IMAGES } from "../../src/lib/constants";
import { ContentCard } from "../../src/components/ContentCard";

export default function CategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    number | undefined
  >(undefined);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Add subcategory state
  const [showAddSubcat, setShowAddSubcat] = useState(false);
  const [subcatName, setSubcatName] = useState("");
  const [subcatDescription, setSubcatDescription] = useState("");

  const { data: category, isLoading: catLoading } =
    trpc.categories.getById.useQuery({ categoryId });

  const { data: subcategories = [] } = trpc.subcategories.list.useQuery({
    categoryId,
  });

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch,
    isRefetching,
  } = trpc.content.listByCategory.useQuery({
    categoryId,
    subcategoryId: selectedSubcategoryId,
  });

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
    },
  });

  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.getById.invalidate({ categoryId });
      utils.categories.list.invalidate();
      setShowEditModal(false);
    },
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      router.back();
    },
  });

  const createSubcategory = trpc.subcategories.create.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate({ categoryId });
      setSubcatName("");
      setSubcatDescription("");
      setShowAddSubcat(false);
    },
  });

  const coverUrl =
    category?.coverImageUrl ||
    (category?.name ? CATEGORY_IMAGES[category.name] : null) ||
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80";

  function openEditModal() {
    setEditName(category?.name || "");
    setEditDescription(category?.description || "");
    setShowEditModal(true);
  }

  function handleMenuPress() {
    Alert.alert("Category", undefined, [
      {
        text: "Edit Category",
        onPress: openEditModal,
      },
      {
        text: "Delete Category",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Category",
            "Are you sure you want to delete this category? This action cannot be undone.",
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
  }

  function handleSaveEdit() {
    if (!editName.trim()) return;
    updateCategory.mutate({
      categoryId,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
  }

  function handleAddSubcategory() {
    if (!subcatName.trim()) return;
    createSubcategory.mutate({
      categoryId,
      name: subcatName.trim(),
      description: subcatDescription.trim() || undefined,
    });
  }

  if (catLoading) {
    return (
      <View
        style={[styles.loadingFullScreen, { backgroundColor: colors.bg }]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Category Cover Image Header */}
      <View style={styles.headerImageContainer}>
        <Image
          source={{ uri: coverUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.55)" },
          ]}
        />

        {/* Top nav row */}
        <View
          style={[
            styles.headerNav,
            { paddingTop: insets.top + 8, paddingHorizontal: 16 },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.circleBtn}>
            <ArrowLeft size={22} color="#FFF" />
          </Pressable>

          <Pressable onPress={handleMenuPress} style={styles.circleBtn}>
            <MoreHorizontal size={22} color="#FFF" />
          </Pressable>
        </View>

        {/* Bottom info */}
        <View style={styles.headerInfo}>
          <Text style={styles.categoryTitle}>
            {category?.name || "Category"}
          </Text>
          {category?.description ? (
            <Text style={styles.categoryDesc}>{category.description}</Text>
          ) : null}
        </View>
      </View>

      {/* Main scrollable area */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
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
          {/* Add Subcategory glass card */}
          <View
            style={[
              styles.addSubcatCard,
              {
                backgroundColor: colors.glassBg,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <Pressable
              style={styles.addSubcatHeader}
              onPress={() => setShowAddSubcat((prev) => !prev)}
            >
              <Text style={[styles.addSubcatLabel, { color: colors.textMuted }]}>
                Add Subcategory
              </Text>
              <View
                style={[
                  styles.smallCircleBtn,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Plus size={16} color="#FFF" />
              </View>
            </Pressable>

            {showAddSubcat && (
              <View style={styles.addSubcatForm}>
                <TextInput
                  style={[
                    styles.compactInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Subcategory name"
                  placeholderTextColor={colors.textSubtle}
                  value={subcatName}
                  onChangeText={setSubcatName}
                />
                <TextInput
                  style={[
                    styles.compactInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                      marginTop: 8,
                    },
                  ]}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.textSubtle}
                  value={subcatDescription}
                  onChangeText={setSubcatDescription}
                />
                <Pressable
                  onPress={handleAddSubcategory}
                  disabled={createSubcategory.isPending}
                  style={[styles.addSubcatBtn, { backgroundColor: "#FFF" }]}
                >
                  {createSubcategory.isPending ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Text style={[styles.addSubcatBtnText, { color: "#000" }]}>
                      Add
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Subcategory Pills */}
          {subcategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.subcategoriesScroll}
              contentContainerStyle={styles.subcategoriesContainer}
            >
              <Pressable
                onPress={() => setSelectedSubcategoryId(undefined)}
                style={[
                  styles.subcatPill,
                  {
                    backgroundColor:
                      selectedSubcategoryId === undefined
                        ? colors.accent
                        : colors.surfaceHover,
                    borderColor:
                      selectedSubcategoryId === undefined
                        ? colors.accent
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subcatText,
                    {
                      color:
                        selectedSubcategoryId === undefined
                          ? "#FFF"
                          : colors.text,
                    },
                  ]}
                >
                  All
                </Text>
              </Pressable>

              {subcategories.map((sub) => {
                const isSelected = selectedSubcategoryId === sub.id;
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => router.push(`/subcategory/${sub.id}` as any)}
                    onLongPress={() => setSelectedSubcategoryId(sub.id)}
                    style={[
                      styles.subcatPill,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : colors.surfaceHover,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subcatText,
                        { color: isSelected ? "#FFF" : colors.text },
                      ]}
                    >
                      {sub.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Items header */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Items ({items.length})
            </Text>

            <Pressable
              onPress={() => router.push("/(tabs)/add" as any)}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Plus size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {itemsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : null}

          {!itemsLoading && items.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No items in this category yet.
              </Text>
            </View>
          )}

          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item as any}
              onPress={() => {}}
              onUpdateStatus={(newStatus) =>
                updateStatus.mutate({ itemId: item.id, status: newStatus })
              }
              onDelete={() => deleteItem.mutate({ itemId: item.id })}
            />
          ))}
        </View>
      </ScrollView>

      {/* Edit Category Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.glassBg,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Category
              </Text>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Name input */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              Name
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Category name"
              placeholderTextColor={colors.textSubtle}
              value={editName}
              onChangeText={setEditName}
            />

            {/* Description input */}
            <Text
              style={[
                styles.inputLabel,
                { color: colors.textMuted, marginTop: 12 },
              ]}
            >
              Description
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                styles.modalInputMultiline,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSubtle}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={3}
            />

            {/* Save button */}
            <Pressable
              onPress={handleSaveEdit}
              disabled={updateCategory.isPending}
              style={[styles.saveBtn, { backgroundColor: "#FFF" }]}
            >
              {updateCategory.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Check size={16} color="#000" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
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
  },
  loadingFullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerImageContainer: {
    height: 220,
    justifyContent: "space-between",
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  categoryDesc: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 640,
  },
  // Add subcategory card
  addSubcatCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  addSubcatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  addSubcatLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  smallCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addSubcatForm: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  compactInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
  },
  addSubcatBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  addSubcatBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  // Subcategory pills
  subcategoriesScroll: {
    marginBottom: 16,
  },
  subcategoriesContainer: {
    gap: 8,
  },
  subcatPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subcatText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Section header
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
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
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
  },
  modalInputMultiline: {
    height: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  saveBtnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
