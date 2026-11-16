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
import { ArrowLeft, MoreHorizontal, X, Check, Plus } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { ContentCard } from "../../src/components/ContentCard";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80";

export default function SubcategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subcategoryId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: subcategory, isLoading: subcatLoading } =
    trpc.subcategories.getById.useQuery({ subcategoryId });

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch,
    isRefetching,
  } = trpc.content.listBySubcategory.useQuery({ subcategoryId });

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listBySubcategory.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listBySubcategory.invalidate();
    },
  });

  const updateSubcategory = trpc.subcategories.update.useMutation({
    onSuccess: () => {
      utils.subcategories.getById.invalidate({ subcategoryId });
      setShowEditModal(false);
    },
  });

  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      router.back();
    },
  });

  const coverUrl = subcategory?.coverImageUrl || FALLBACK_IMAGE;

  function openEditModal() {
    setEditName(subcategory?.name || "");
    setEditDescription(subcategory?.description || "");
    setShowEditModal(true);
  }

  function handleMenuPress() {
    Alert.alert("Subcategory", undefined, [
      {
        text: "Edit Subcategory",
        onPress: openEditModal,
      },
      {
        text: "Delete Subcategory",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Subcategory",
            "Are you sure you want to delete this subcategory? This action cannot be undone.",
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
  }

  function handleSaveEdit() {
    if (!editName.trim()) return;
    updateSubcategory.mutate({
      subcategoryId,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
  }

  if (subcatLoading) {
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
      {/* Subcategory Cover Image Header */}
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
          <Text style={styles.subcatTitle}>
            {subcategory?.name || "Subcategory"}
          </Text>
          {subcategory?.description ? (
            <Text style={styles.subcatDesc}>{subcategory.description}</Text>
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
                No items in this subcategory yet.
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

      {/* Edit Subcategory Modal */}
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
                Edit Subcategory
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
              placeholder="Subcategory name"
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
              disabled={updateSubcategory.isPending}
              style={[styles.saveBtn, { backgroundColor: "#FFF" }]}
            >
              {updateSubcategory.isPending ? (
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
    height: 200,
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
  subcatTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subcatDesc: {
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
