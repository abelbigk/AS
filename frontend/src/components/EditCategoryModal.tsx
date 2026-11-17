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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { X, ImagePlus, Trash2, Camera } from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { uploadFile } from "../lib/upload";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";

interface EditCategoryModalProps {
  category: {
    id: number;
    name: string;
    description?: string | null;
    coverImageUrl?: string | null;
    coverImageKey?: string | null;
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
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [newCoverAsset, setNewCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateCategoryMutation = trpc.categories.update.useMutation();

  useEffect(() => {
    if (category && visible) {
      setName(category.name || "");
      setDescription(category.description || "");
      setCoverUrl(category.coverImageUrl || null);
      setRemoveCover(false);
      setNewCoverAsset(null);
    }
  }, [category, visible]);

  if (!category) return null;

  const handlePickCover = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets[0]) {
        setNewCoverAsset(res.assets[0]);
        setCoverUrl(res.assets[0].uri);
        setRemoveCover(false);
      }
    } catch (err) {
      console.error("Failed to pick cover:", err);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert("Validation", "Category name is required");
      return;
    }

    setIsSaving(true);
    try {
      let finalCoverUrl = coverUrl;
      let finalCoverKey = category.coverImageKey;

      if (newCoverAsset) {
        const uploadRes = await uploadFile(
          newCoverAsset.uri,
          newCoverAsset.fileName || `cat_cover_${Date.now()}.jpg`,
          newCoverAsset.mimeType || "image/jpeg"
        );
        if (uploadRes) {
          finalCoverUrl = uploadRes.url;
          finalCoverKey = uploadRes.key;
        }
      }

      await updateCategoryMutation.mutateAsync({
        categoryId: category.id,
        name: name.trim(),
        description: description.trim() || undefined,
        coverImageUrl: removeCover ? undefined : finalCoverUrl || undefined,
        coverImageKey: removeCover ? undefined : finalCoverKey || undefined,
        removeCover,
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
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Category</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Category name"
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
              <Text style={[styles.label, { color: colors.textMuted }]}>Cover Image</Text>
              {coverUrl && !removeCover ? (
                <View style={styles.coverPreviewContainer}>
                  <Image source={{ uri: coverUrl }} style={styles.coverPreview} contentFit="cover" />
                  <View style={styles.coverActions}>
                    <Pressable onPress={handlePickCover} style={styles.coverActionBtn}>
                      <Camera size={13} color="#FFFFFF" />
                      <Text style={styles.coverActionText}>Replace</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setRemoveCover(true);
                        setCoverUrl(null);
                        setNewCoverAsset(null);
                      }}
                      style={[styles.coverActionBtn, { backgroundColor: "rgba(239, 68, 68, 0.85)" }]}
                    >
                      <Trash2 size={13} color="#FFFFFF" />
                      <Text style={styles.coverActionText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={handlePickCover} style={[styles.uploadDropzone, { borderColor: colors.border }]}>
                  <ImagePlus size={22} color={colors.textSubtle} />
                  <Text style={[styles.uploadDropzoneText, { color: colors.textMuted }]}>
                    Attach Cover Image
                  </Text>
                </Pressable>
              )}
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
