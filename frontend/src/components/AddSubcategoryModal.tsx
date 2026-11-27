import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { X, Pencil, ImagePlus } from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { uploadFile } from "../lib/upload";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import { ImagePickerToggle, type ImageValue } from "./ImagePickerToggle";
import { EditSubcategoryModal } from "./EditSubcategoryModal";

interface AddSubcategoryModalProps {
  categoryId: number;
  categoryName?: string;
  visible: boolean;
  onClose: () => void;
  onSubcategoryCreated?: () => void;
}

export function AddSubcategoryModal({
  categoryId,
  categoryName,
  visible,
  onClose,
  onSubcategoryCreated,
}: AddSubcategoryModalProps) {
  const { colors, theme } = useTheme();
  const utils = trpc.useUtils();
  const { dialogState, hide, showAlert, showConfirm } = useAppDialog();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<ImageValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any | null>(null);

  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
    enabled: visible && !categoryName,
  });
  const { data: allSubcategories = [] } = trpc.subcategories.listAll.useQuery(undefined, {
    enabled: visible,
  });
  const { data: subcategories = [] } = trpc.subcategories.list.useQuery(
    { categoryId },
    { enabled: visible && !!categoryId }
  );

  const resolvedCategoryName = useMemo(() => {
    if (categoryName) return categoryName;
    return categories.find((c) => c.id === categoryId)?.name;
  }, [categoryName, categories, categoryId]);

  const similar =
    name.trim().length > 1
      ? allSubcategories.filter(
          (s) => s.name.toLowerCase() === name.trim().toLowerCase()
        )
      : [];

  const createSubcategoryMutation = trpc.subcategories.create.useMutation();
  const deleteSubcategoryMutation = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate({ categoryId });
      utils.subcategories.getContentCounts.invalidate({ categoryId });
      utils.content.listUncategorized.invalidate();
    },
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      showAlert("Validation", "Subcategory name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      let coverUrl: string | undefined = undefined;
      let coverKey: string | undefined = undefined;

      if (coverImage) {
        if (coverImage.isUrl) {
          coverUrl = coverImage.uri;
        } else if (coverImage.asset) {
          const uploadRes = await uploadFile(
            coverImage.asset.uri,
            coverImage.asset.fileName || `sub_cover_${Date.now()}.jpg`,
            coverImage.asset.mimeType || "image/jpeg"
          );
          if (uploadRes) {
            coverUrl = uploadRes.url;
            coverKey = uploadRes.key;
          }
        }
      }

      await createSubcategoryMutation.mutateAsync({
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        coverImageUrl: coverUrl,
        coverImageKey: coverKey,
        coverCropData: coverImage?.cropData
          ? JSON.stringify(coverImage.cropData)
          : undefined,
      });

      utils.subcategories.list.invalidate({ categoryId });
      setName("");
      setDescription("");
      setCoverImage(null);
      onSubcategoryCreated?.();
      onClose();
    } catch (err: any) {
      showAlert("Error", err?.message || "Failed to create subcategory");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBg = theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC";

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View
          style={[
            styles.modalBackdrop,
            Platform.OS === "web"
              ? ({ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as any)
              : null,
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.modalSheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Subcategory</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  {resolvedCategoryName
                    ? `Create a new sub-grouping within ${resolvedCategoryName}`
                    : "Create a new sub-grouping"}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Subcategory Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border, backgroundColor: inputBg },
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Fantasy"
                    placeholderTextColor={colors.textSubtle}
                  />
                  {similar.length > 0 && (
                    <View style={[styles.similarBanner, { borderColor: colors.border }]}>
                      {similar.map((s) => (
                        <View key={s.id} style={styles.similarRow}>
                          <View style={styles.similarDot} />
                          <Text style={[styles.similarText, { color: colors.textMuted }]}>
                            Already exists:{" "}
                            <Text style={[styles.similarName, { color: colors.text }]}>{s.name}</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Description (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.multilineInput,
                      { color: colors.text, borderColor: colors.border, backgroundColor: inputBg },
                    ]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add a description..."
                    placeholderTextColor={colors.textSubtle}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Cover Image */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Cover Image</Text>
                  <ImagePickerToggle
                    label="Cover Image"
                    currentImageUrl={coverImage?.uri}
                    currentCropData={
                      coverImage?.cropData ? JSON.stringify(coverImage.cropData) : null
                    }
                    naturalRatio={true}
                    frameHeight={160}
                    onImageSelected={setCoverImage}
                  />
                </View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={[
                    styles.submitBtn,
                    { backgroundColor: theme === "dark" ? "#FFFFFF" : "#111827" },
                    isSubmitting && { opacity: 0.6 },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator
                      color={theme === "dark" ? "#000000" : "#FFFFFF"}
                      size="small"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.submitBtnText,
                        { color: theme === "dark" ? "#000000" : "#FFFFFF" },
                      ]}
                    >
                      {`Create Subcategory${coverImage ? " ✓ image ready" : ""}`}
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* SUBCATEGORIES IN THIS CATEGORY section matching screenshot */}
              {subcategories.length > 0 && (
                <View style={styles.existingSection}>
                  <Text style={[styles.existingHeader, { color: colors.textMuted }]}>
                    SUBCATEGORIES IN THIS CATEGORY
                  </Text>
                  <View style={styles.existingList}>
                    {subcategories.map((sub) => (
                      <View
                        key={sub.id}
                        style={[
                          styles.existingRow,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.existingThumb,
                            { backgroundColor: inputBg },
                          ]}
                        >
                          {sub.coverImageUrl ? (
                            <Image
                              source={{ uri: sub.coverImageUrl }}
                              style={StyleSheet.absoluteFill}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.existingThumbFallback}>
                              <ImagePlus size={14} color={colors.textSubtle} />
                            </View>
                          )}
                        </View>
                        <View style={styles.existingInfo}>
                          <Text
                            style={[styles.existingName, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {sub.name}
                          </Text>
                          {sub.description ? (
                            <Text
                              style={[styles.existingDesc, { color: colors.textMuted }]}
                              numberOfLines={1}
                            >
                              {sub.description}
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => setEditingSubcategory(sub)}
                          style={styles.existingIconBtn}
                          hitSlop={8}
                        >
                          <Pencil size={15} color={colors.textMuted} />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            showConfirm({
                              title: "Delete this subcategory?",
                              message:
                                "This will permanently delete the subcategory. Any content not linked to other categories or subcategories will be in the Uncategorized section in Settings.",
                              confirmText: "Delete",
                              destructive: true,
                              onConfirm: () =>
                                deleteSubcategoryMutation.mutate({ subcategoryId: sub.id }),
                            });
                          }}
                          style={styles.existingIconBtn}
                          hitSlop={8}
                        >
                          <X size={15} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <EditSubcategoryModal
        subcategory={editingSubcategory}
        visible={!!editingSubcategory}
        onClose={() => setEditingSubcategory(null)}
        onSaved={() => {
          utils.subcategories.list.invalidate({ categoryId });
        }}
      />

      <AppDialogRenderer {...dialogState} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "rgba(0, 0, 0, 0.58)" : "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 22,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  multilineInput: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  submitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  similarBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    gap: 6,
  },
  similarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  similarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EAB308",
  },
  similarText: {
    fontSize: 13,
  },
  similarName: {
    fontWeight: "600",
  },
  existingSection: {
    marginTop: 22,
    gap: 10,
  },
  existingHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  existingList: {
    gap: 8,
  },
  existingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  existingThumb: {
    width: 40,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
  },
  existingThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  existingInfo: {
    flex: 1,
    gap: 2,
  },
  existingName: {
    fontSize: 14,
    fontWeight: "600",
  },
  existingDesc: {
    fontSize: 11,
  },
  existingIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
});
