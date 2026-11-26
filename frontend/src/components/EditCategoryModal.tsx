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
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { uploadFile } from "../lib/upload";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import { ImagePickerToggle, type ImageValue } from "./ImagePickerToggle";
import { CATEGORY_IMAGES } from "../lib/constants";

interface EditCategoryModalProps {
  category: {
    id: number;
    name: string;
    description?: string | null;
    coverImageUrl?: string | null;
    coverImageKey?: string | null;
    coverCropData?: string | null;
  } | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditCategoryModal({
  category,
  visible,
  onClose,
  onSaved,
}: EditCategoryModalProps) {
  const { colors, theme } = useTheme();
  const utils = trpc.useUtils();
  const { dialogState, hide, showAlert } = useAppDialog();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<ImageValue | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const updateCategoryMutation = trpc.categories.update.useMutation();

  useEffect(() => {
    if (category && visible) {
      setName(category.name || "");
      setDescription(category.description || "");
      const currentCover = category.coverImageUrl || CATEGORY_IMAGES[category.name] || "";
      if (currentCover) {
        let parsedCrop = null;
        if (category.coverCropData) {
          try {
            parsedCrop = JSON.parse(category.coverCropData);
          } catch {}
        }
        setCoverImage({
          uri: currentCover,
          isUrl: true,
          asset: null,
          cropData: parsedCrop,
        });
      } else {
        setCoverImage(null);
      }

    }
  }, [category, visible]);

  if (!category) return null;



  const handleSave = async () => {
    if (!name.trim()) {
      showAlert("Validation", "Category name is required");
      return;
    }

    setIsSaving(true);
    try {
      let finalCoverUrl: string | undefined = undefined;
      let finalCoverKey: string | undefined = category.coverImageKey || undefined;

      if (coverImage) {
        if (coverImage.isUrl) {
          finalCoverUrl = coverImage.uri;
        } else if (coverImage.asset) {
          const uploadRes = await uploadFile(
            coverImage.asset.uri,
            coverImage.asset.fileName || `cat_cover_${Date.now()}.jpg`,
            coverImage.asset.mimeType || "image/jpeg"
          );
          if (uploadRes) {
            finalCoverUrl = uploadRes.url;
            finalCoverKey = uploadRes.key;
          }
        }
      }

      const shouldRemove = !coverImage;

      await updateCategoryMutation.mutateAsync({
        categoryId: category.id,
        name: name.trim(),
        description: description.trim() || undefined,
        coverImageUrl: shouldRemove ? undefined : finalCoverUrl,
        coverImageKey: shouldRemove ? undefined : finalCoverKey,
        coverCropData: shouldRemove
          ? undefined
          : coverImage?.cropData
          ? JSON.stringify(coverImage.cropData)
          : undefined,
        removeCover: shouldRemove,
      });

      utils.categories.list.invalidate();
      utils.categories.getById.invalidate({ categoryId: category.id });

      onSaved?.();
      onClose();
    } catch (err: any) {
      showAlert("Error", err?.message || "Failed to save category details");
    } finally {
      setIsSaving(false);
    }
  };

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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Category</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Update category name, description and cover image.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Category name"
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                  },
                ]}
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
              <Text style={[styles.label, { color: colors.textMuted }]}>Cover Image</Text>
              <ImagePickerToggle
                label="Attach Cover Image"
                currentImageUrl={coverImage?.uri}
                currentCropData={
                  coverImage?.cropData
                    ? JSON.stringify(coverImage.cropData)
                    : category.coverCropData
                }
                naturalRatio={false}
                frameHeight={112}
                onImageSelected={setCoverImage}
              />
            </View>

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[
                styles.submitBtn,
                { backgroundColor: theme === "dark" ? "#FFFFFF" : "#111827" },
                isSaving && { opacity: 0.6 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={theme === "dark" ? "#000000" : "#FFFFFF"} size="small" />
              ) : (
                <Text style={[styles.submitBtnText, { color: theme === "dark" ? "#000000" : "#FFFFFF" }]}>
                  Save Changes
                </Text>
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
    backgroundColor: Platform.OS === "web" ? "rgba(0, 0, 0, 0.58)" : "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
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
    height: 140,
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
