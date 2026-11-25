import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FolderPlus, Info, ImagePlus, Trash2, Pencil } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { usePullToRefresh } from "../../src/hooks/usePullToRefresh";
import { uploadFile } from "../../src/lib/upload";
import { EditCategoryModal } from "../../src/components/EditCategoryModal";
import { CATEGORY_IMAGES } from "../../src/lib/constants";
import { AppDialogRenderer, useAppDialog } from "../../src/components/AppDialog";
import { AppToastRenderer, useAppToast } from "../../src/components/AppToast";
import { ImagePickerToggle, type ImageValue } from "../../src/components/ImagePickerToggle";

const ADD_DARK_IMAGE =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1600&q=80";
const ADD_LIGHT_IMAGE =
  "https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=1600&q=80";

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const { dialogState, hide, showAlert, showConfirm } = useAppDialog();
  const { toastState, showToast } = useAppToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<ImageValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategoryForEdit, setActiveCategoryForEdit] = useState<any | null>(null);

  const utils = trpc.useUtils();

  const { data: categories = [], refetch: refetchCategories } = trpc.categories.list.useQuery();
  const { refreshControlProps } = usePullToRefresh(async () => {
    await Promise.all([refetchCategories(), utils.subcategories.list.invalidate()]);
  });

  const createCategory = trpc.categories.create.useMutation();

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
    },
  });

  const similar =
    name.trim().length > 1
      ? categories.filter((c) => c.name.toLowerCase() === name.trim().toLowerCase())
      : [];

  const bgImage = theme === "dark" ? ADD_DARK_IMAGE : ADD_LIGHT_IMAGE;



  const handleSubmit = async () => {
    if (!name.trim()) {
      showAlert("Validation", "Please enter a category name.");
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
            coverImage.asset.fileName || `category_cover_${Date.now()}.jpg`,
            coverImage.asset.mimeType || "image/jpeg"
          );
          if (uploadRes) {
            coverUrl = uploadRes.url;
            coverKey = uploadRes.key;
          }
        }
      }

      await createCategory.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        coverImageUrl: coverUrl,
        coverImageKey: coverKey,
      });

      utils.categories.list.invalidate();
      showToast("Category created!", "success");
      setName("");
      setDescription("");
      setCoverImage(null);
      router.push("/");
    } catch (err: any) {
      showToast(err?.message || "Failed to create category.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlayColor =
    theme === "dark" ? "rgba(10,10,10,0.55)" : "rgba(255,255,255,0.65)";

  const glassCard = {
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  } as const;

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  } as const;

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        blurRadius={Platform.OS !== "web" ? 25 : undefined}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: overlayColor,
            ...(Platform.OS === "web"
              ? ({ backdropFilter: "blur(20px)" } as object)
              : {}),
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl {...refreshControlProps} />}
      >
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={styles.headerRow}>
            <FolderPlus size={36} color="#3B82F6" />
            <Text style={[styles.title, { color: colors.text }]}>
              New Category
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Create a beautiful space to organize your collections
          </Text>

          {/* Blue info banner */}
          <View style={styles.infoBanner}>
            <Info size={18} color="#3B82F6" style={{ marginTop: 2 }} />
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>
                Tip: Adding items &amp; subcategories
              </Text>
              <Text style={styles.infoBannerText}>
                To add subcategories or content, open the category page you
                created and add them directly. This automatically links them to
                the correct category!
              </Text>
            </View>
          </View>

          {/* Form card */}
          <View style={glassCard}>
            <Text style={[styles.label, { color: colors.text }]}>
              Category Name *
            </Text>
            <TextInput
              style={[inputStyle, { marginBottom: similar.length > 0 ? 8 : 16 }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter category name..."
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="words"
            />
            {similar.length > 0 && (
              <View style={[styles.similarBanner, { borderColor: colors.border }]}>
                {similar.map((c) => (
                  <View key={c.id} style={styles.similarRow}>
                    <View style={styles.similarDot} />
                    <Text style={[styles.similarText, { color: colors.textMuted }]}>
                      Already exists:{" "}
                      <Text style={[styles.similarName, { color: colors.text }]}>{c.name}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.label, { color: colors.text }]}>
              Description (optional)
            </Text>
            <TextInput
              style={[inputStyle, { height: 90, textAlignVertical: "top", marginBottom: 16 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your category..."
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={4}
            />

            <ImagePickerToggle
              label="Cover Image (optional)"
              currentImageUrl={coverImage?.uri}
              onImageSelected={setCoverImage}
            />

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { opacity: pressed || isSubmitting ? 0.75 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Category</Text>
              )}
            </Pressable>
          </View>

          {/* Existing Categories section matching web AddCategoryForm.tsx */}
          {categories.length > 0 && (
            <View style={styles.existingSection}>
              <Text style={[styles.existingSectionHeader, { color: colors.textSubtle }]}>
                EXISTING CATEGORIES
              </Text>
              <View style={styles.existingList}>
                {categories.map((cat) => (
                  <View
                    key={cat.id}
                    style={[
                      styles.existingRow,
                      { backgroundColor: colors.glassBg, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.existingThumb}>
                      <Image
                        source={{
                          uri:
                            cat.coverImageUrl ||
                            CATEGORY_IMAGES[cat.name] ||
                            ADD_DARK_IMAGE,
                        }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    </View>
                    <View style={styles.existingInfo}>
                      <Text
                        style={[styles.existingName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      {cat.description ? (
                        <Text
                          style={[styles.existingDesc, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {cat.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.existingActions}>
                      <Pressable
                        onPress={() => setActiveCategoryForEdit(cat)}
                        style={styles.existingActionBtn}
                        hitSlop={8}
                      >
                        <Pencil size={15} color={colors.textMuted} />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          showConfirm({
                            title: "Delete this category?",
                            message: "This action cannot be undone. All subcategories and content links will be deleted.",
                            confirmText: "Delete",
                            destructive: true,
                            onConfirm: () =>
                              deleteCategory.mutate({ categoryId: cat.id }),
                          });
                        }}
                        style={styles.existingActionBtn}
                        hitSlop={8}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Category Modal */}
      <EditCategoryModal
        category={activeCategoryForEdit}
        visible={!!activeCategoryForEdit}
        onClose={() => setActiveCategoryForEdit(null)}
      />

      <AppDialogRenderer {...dialogState} onHide={hide} />
      <AppToastRenderer {...toastState} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  wrapper: {
    maxWidth: 672,
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderColor: "rgba(59,130,246,0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
  },
  infoBannerText: {
    color: "#93C5FD",
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  coverPreviewContainer: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
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
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    gap: 4,
    marginBottom: 16,
  },
  uploadDropzoneText: {
    fontSize: 12,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
  similarBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 16,
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
    marginTop: 32,
    marginBottom: 20,
  },
  existingSectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  existingList: {
    gap: 8,
  },
  existingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  existingThumb: {
    width: 48,
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
  },
  existingInfo: {
    flex: 1,
  },
  existingName: {
    fontSize: 14,
    fontWeight: "600",
  },
  existingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  existingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  existingActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
