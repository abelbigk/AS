import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { X, Check } from "lucide-react-native";
import { ImagePickerToggle, type ImageValue } from "./ImagePickerToggle";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { uploadFile } from "../lib/upload";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";

interface EditSubcategoryModalProps {
  subcategory: {
    id: number;
    name: string;
    description?: string | null;
    coverImageUrl?: string | null;
    coverImageKey?: string | null;
    categoryId?: number;
  } | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditSubcategoryModal({
  subcategory,
  visible,
  onClose,
  onSaved,
}: EditSubcategoryModalProps) {
  const { colors, theme } = useTheme();
  const utils = trpc.useUtils();
  const { dialogState, hide, showAlert } = useAppDialog();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [coverImage, setCoverImage] = useState<ImageValue | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
    enabled: visible,
  });

  const updateSubcategoryMutation = trpc.subcategories.update.useMutation();

  useEffect(() => {
    if (subcategory && visible) {
      setName(subcategory.name || "");
      setDescription(subcategory.description || "");
      setSelectedCategoryId(subcategory.categoryId);
      if (subcategory.coverImageUrl) {
        setCoverImage({ uri: subcategory.coverImageUrl, isUrl: true, asset: null });
      } else {
        setCoverImage(null);
      }
    }
  }, [subcategory, visible]);

  if (!subcategory) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert("Validation", "Subcategory name is required");
      return;
    }

    setIsSaving(true);
    try {
      let finalCoverUrl: string | undefined = undefined;
      let finalCoverKey: string | undefined = subcategory.coverImageKey || undefined;

      if (coverImage) {
        if (coverImage.isUrl) {
          finalCoverUrl = coverImage.uri;
        } else if (coverImage.asset) {
          const uploadRes = await uploadFile(
            coverImage.asset.uri,
            coverImage.asset.fileName || `sub_cover_${Date.now()}.jpg`,
            coverImage.asset.mimeType || "image/jpeg"
          );
          if (uploadRes) {
            finalCoverUrl = uploadRes.url;
            finalCoverKey = uploadRes.key;
          }
        }
      }

      const shouldRemove = !coverImage;

      await updateSubcategoryMutation.mutateAsync({
        subcategoryId: subcategory.id,
        categoryId: selectedCategoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        coverImageUrl: shouldRemove ? undefined : finalCoverUrl,
        coverImageKey: shouldRemove ? undefined : finalCoverKey,
        removeCover: shouldRemove,
      });

      utils.subcategories.getById.invalidate({ subcategoryId: subcategory.id });
      if (selectedCategoryId) {
        utils.subcategories.list.invalidate({ categoryId: selectedCategoryId });
      }
      if (subcategory.categoryId && subcategory.categoryId !== selectedCategoryId) {
        utils.subcategories.list.invalidate({ categoryId: subcategory.categoryId });
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      showAlert("Error", err?.message || "Failed to save subcategory details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Subcategory</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Update subcategory name, description and cover image.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Parent Category Selector */}
            {categories.length > 0 && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Parent Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPills}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategoryId(cat.id)}
                        style={[
                          styles.catPill,
                          isSelected
                            ? { backgroundColor: "rgba(59, 130, 246, 0.2)", borderColor: "#3B82F6" }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                      >
                        {isSelected && <Check size={12} color="#3B82F6" style={{ marginRight: 4 }} />}
                        <Text style={[styles.catPillText, { color: isSelected ? "#3B82F6" : colors.text }]}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Subcategory Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Subcategory name"
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSubtle}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Cover Image */}
            <View style={styles.fieldGroup}>
              <ImagePickerToggle
                label="Cover Image"
                currentImageUrl={coverImage?.uri}
                onImageSelected={setCoverImage}
              />
            </View>

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.submitBtn, isSaving && { opacity: 0.6 }]}
            >
              {isSaving ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
    <AppDialogRenderer {...dialogState} onHide={hide} />
  </>
);
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  categoryPills: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  multilineInput: {
    height: 75,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  coverPreviewContainer: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  coverPreview: {
    width: "100%",
    height: "100%",
  },
  coverActions: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
  },
  coverActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  coverActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  uploadDropzone: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    gap: 4,
  },
  uploadDropzoneText: {
    fontSize: 12,
    fontWeight: "500",
  },
  submitBtn: {
    backgroundColor: "#FFFFFF",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
