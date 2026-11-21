import React, { useState } from "react";
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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { X, ImagePlus, Trash2 } from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { uploadFile } from "../lib/upload";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import { ImagePickerToggle, type ImageValue } from "./ImagePickerToggle";

interface AddSubcategoryModalProps {
  categoryId: number;
  visible: boolean;
  onClose: () => void;
  onSubcategoryCreated?: () => void;
}

export function AddSubcategoryModal({
  categoryId,
  visible,
  onClose,
  onSubcategoryCreated,
}: AddSubcategoryModalProps) {
  const { colors, theme } = useTheme();
  const utils = trpc.useUtils();
  const { dialogState, hide, showAlert } = useAppDialog();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<ImageValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: allSubcategories = [] } = trpc.subcategories.listAll.useQuery();

  const similar =
    name.trim().length > 1
      ? allSubcategories.filter(
          (s) => s.name.toLowerCase() === name.trim().toLowerCase()
        )
      : [];

  const createSubcategoryMutation = trpc.subcategories.create.useMutation();



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

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Subcategory</Text>
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
                placeholder="Subcategory name"
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
              <Text style={[styles.label, { color: colors.textMuted }]}>Cover Image</Text>
              <ImagePickerToggle
                label="Attach Cover Image (optional)"
                currentImageUrl={coverImage?.uri}
                onImageSelected={setCoverImage}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create Subcategory</Text>
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
    maxHeight: "85%",
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
  removeCoverBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadDropzone: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
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
  similarBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
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
});
