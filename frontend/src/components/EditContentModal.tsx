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
  Linking,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  X,
  Pencil,
  Trash2,
  ImagePlus,
  Plus,
  Check,
  Film,
  Camera,
  MapPin,
  Navigation,
  Link2,
} from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { uploadFile } from "../lib/upload";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import type { ContentItem } from "./ContentCard";
import { ImagePickerToggle, type ImageValue } from "./ImagePickerToggle";
import { UploadProgress } from "./UploadProgress";

interface EditContentModalProps {
  item: ContentItem | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditContentModal({
  item,
  visible,
  onClose,
  onSaved,
}: EditContentModalProps) {
  const { colors, theme } = useTheme();
  const utils = trpc.useUtils();
  const { dialogState, hide, showAlert, showConfirm } = useAppDialog();

  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<number[]>([]);

  // Poster state
  const [posterImage, setPosterImage] = useState<ImageValue | null>(null);

  // New media state
  const [pendingMedia, setPendingMedia] = useState<
    Array<{ asset: ImagePicker.ImagePickerAsset; type: "image" | "video" }>
  >([]);
  // Media items queued for deletion on Save Changes
  const [deletedMediaIds, setDeletedMediaIds] = useState<number[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadLoadedBytes, setUploadLoadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "cover" | "saving_entry" | "media" | "processing">("idle");
  const [currentUploadFileName, setCurrentUploadFileName] = useState("Media file");

  // Location state
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [locationLinkUrl, setLocationLinkUrl] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationLinkInput, setLocationLinkInput] = useState("");
  const [showLocationLinkField, setShowLocationLinkField] = useState(false);

  // Categories & Subcategories data
  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
    enabled: visible,
  });
  const { data: allSubcategories = [] } = trpc.subcategories.listAll.useQuery(undefined, {
    enabled: visible,
  });

  // Media list for this content item
  const { data: mediaItems = [], refetch: refetchMedia } =
    trpc.media.listByContent.useQuery(
      { contentItemId: item?.id || 0 },
      { enabled: !!item?.id && visible }
    );

  const deleteMediaMutation = trpc.media.delete.useMutation({
    onSuccess: () => {
      refetchMedia();
    },
  });

  const updateContentMutation = trpc.content.update.useMutation();
  const addMediaMutation = trpc.media.add.useMutation();

  useEffect(() => {
    if (item && visible) {
      setHeading(item.heading || "");
      setDescription(item.description || "");
      setSelectedCategoryIds(item.categoryIds || []);
      setSelectedSubcategoryIds(item.subcategoryIds || []);
      if (item.posterImageUrl) {
        setPosterImage({ uri: item.posterImageUrl, isUrl: true, asset: null });
      } else {
        setPosterImage(null);
      }
      setPendingMedia([]);
      setDeletedMediaIds([]);
      setSavingProgress("");
      setLatitude(item.latitude ?? null);
      setLongitude(item.longitude ?? null);
      setLocationLinkUrl(item.locationLinkUrl ?? null);
      setIsLocating(false);
      setLocationLinkInput("");
      setShowLocationLinkField(false);
    }
  }, [item, visible]);

  if (!item) return null;

  // Toggle Category Checkbox
  const toggleCategory = (catId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  // Toggle Subcategory Checkbox
  const toggleSubcategory = (subId: number) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };


  // Add more media attachments
  const handlePickMoreMedia = async (source: "gallery" | "camera" = "gallery") => {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showAlert("Permission Denied", "Camera permission is required.");
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 1,
        });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images", "videos"],
          allowsMultipleSelection: true,
          quality: 1,
        });
      }
      if (!res.canceled && res.assets.length > 0) {
        const newItems = res.assets.map((asset) => ({
          asset,
          type: (asset.type === "video" ? "video" : "image") as "image" | "video",
        }));
        setPendingMedia((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error("Failed to pick media:", err);
    }
  };

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permission Denied", "Location permission is required.");
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
      setLocationLinkUrl(null);
    } catch (e: any) {
      showAlert("Error", "Could not get location. " + (e?.message || ""));
    } finally {
      setIsLocating(false);
    }
  };

  // Delete existing media (staged for deletion until Save Changes is pressed)
  const handleDeleteExistingMedia = (mediaId: number) => {
    showConfirm({
      title: "Remove Media",
      message: "Remove this media attachment? The deletion will be applied when you tap 'Save Changes'.",
      confirmText: "Remove",
      destructive: true,
      onConfirm: () => {
        setDeletedMediaIds((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
      },
    });
  };

  // Remove pending newly added media
  const handleRemovePendingMedia = (index: number) => {
    setPendingMedia((prev) => prev.filter((_, i) => i !== index));
  };

  // Save all changes
  const handleSave = async () => {
    if (!heading.trim()) {
      showAlert("Validation", "Heading is required");
      return;
    }

    setIsSaving(true);
    setSavingProgress("Saving details...");
    setUploadStage("cover");

    try {
      let finalPosterUrl: string | undefined = undefined;
      let finalPosterKey: string | undefined = item.posterImageKey || undefined;

      // If user selected a new poster image, upload it
      if (posterImage) {
        if (posterImage.isUrl) {
          finalPosterUrl = posterImage.uri;
        } else if (posterImage.asset) {
          setUploadStage("cover");
          const fName = posterImage.asset.fileName || `cover_${Date.now()}.jpg`;
          setCurrentUploadFileName(fName);
          setSavingProgress("Uploading cover image...");
          const uploadRes = await uploadFile(
            posterImage.asset.uri,
            fName,
            posterImage.asset.mimeType || "image/jpeg",
            (loaded, total) => {
              setUploadLoadedBytes(loaded);
              setUploadTotalBytes(total);
              setUploadPct(Math.round((loaded / total) * 100));
            }
          );
          if (uploadRes) {
            finalPosterUrl = uploadRes.url;
            finalPosterKey = uploadRes.key;
          }
        }
      }

      setUploadStage("saving_entry");
      const shouldRemovePoster = !posterImage;

      // Update the main content record
      const finalLocationLink = locationLinkUrl || (locationLinkInput.trim() || null);
      await updateContentMutation.mutateAsync({
        itemId: item.id,
        heading: heading.trim(),
        description: description.trim() || undefined,
        categoryIds: selectedCategoryIds,
        subcategoryIds: selectedSubcategoryIds,
        posterImageUrl: shouldRemovePoster ? undefined : finalPosterUrl,
        posterImageKey: shouldRemovePoster ? undefined : finalPosterKey,
        removePoster: shouldRemovePoster,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        locationLinkUrl: finalLocationLink,
      });

      // Upload and attach any pending media files
      if (pendingMedia.length > 0) {
        setUploadStage("media");
        for (let i = 0; i < pendingMedia.length; i++) {
          const itemMedia = pendingMedia[i];
          const ext = itemMedia.type === "video" ? "mp4" : "jpg";
          let mName = itemMedia.asset.fileName || `media_${Date.now()}_${i}.${ext}`;
          if (!mName.includes(".")) mName = `${mName}.${ext}`;
          setCurrentUploadFileName(mName);
          setUploadPct(0);
          setSavingProgress(
            `Uploading media ${i + 1} of ${pendingMedia.length}...`
          );
          const uploadRes = await uploadFile(
            itemMedia.asset.uri,
            mName,
            itemMedia.asset.mimeType || (itemMedia.type === "video" ? "video/mp4" : "image/jpeg"),
            (loaded, total) => {
              setUploadLoadedBytes(loaded);
              setUploadTotalBytes(total);
              setUploadPct(Math.round((loaded / total) * 100));
            }
          );

          if (uploadRes) {
            await addMediaMutation.mutateAsync({
              contentItemId: item.id,
              url: uploadRes.url,
              key: uploadRes.key,
              type: itemMedia.type,
              order: (mediaItems.length || 0) + i,
            });
          }
        }
      }

      // Delete any media items that were queued for deletion
      if (deletedMediaIds.length > 0) {
        setSavingProgress("Removing deleted media...");
        for (const mediaId of deletedMediaIds) {
          try {
            await deleteMediaMutation.mutateAsync({ mediaId });
          } catch (e) {
            console.error("Failed to delete media:", mediaId, e);
          }
        }
      }

      setUploadStage("idle");

      // Invalidate queries so all views refresh
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();
      utils.content.getById.invalidate({ itemId: item.id });
      utils.media.listByContent.invalidate({ contentItemId: item.id });

      onSaved?.();
      onClose();
    } catch (err: any) {
      showAlert("Error", err?.message || "Failed to save content changes");
    } finally {
      setIsSaving(false);
      setSavingProgress("");
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme === "dark" ? "#0A0A0A" : "#FFFFFF" }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Details</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Heading *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                },
              ]}
              value={heading}
              onChangeText={setHeading}
              placeholder="Content heading"
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          {/* Description */}
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
              numberOfLines={4}
            />
          </View>

          {/* Cover Poster Image */}
          <View style={styles.fieldGroup}>
            <ImagePickerToggle
              label="Cover Poster"
              currentImageUrl={posterImage?.uri}
              onImageSelected={setPosterImage}
            />
          </View>

          {/* Categories Multi-Select Checkboxes */}
          {categories.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Categories</Text>
              <View style={styles.checkboxGroup}>
                {categories.map((cat) => {
                  const isChecked = selectedCategoryIds.includes(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      style={[
                        styles.chipOption,
                        isChecked
                          ? { backgroundColor: "rgba(59, 130, 246, 0.2)", borderColor: "#3B82F6" }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.checkboxSquare,
                          isChecked ? { backgroundColor: "#3B82F6", borderColor: "#3B82F6" } : { borderColor: colors.textSubtle },
                        ]}
                      >
                        {isChecked && <Check size={12} color="#FFFFFF" />}
                      </View>
                      <Text
                        style={[
                          styles.chipOptionText,
                          { color: isChecked ? "#3B82F6" : colors.text },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Subcategories Multi-Select Checkboxes */}
          {allSubcategories.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Subcategories</Text>
              <View style={styles.checkboxGroup}>
                {allSubcategories.map((sub) => {
                  const isChecked = selectedSubcategoryIds.includes(sub.id);
                  return (
                    <Pressable
                      key={sub.id}
                      onPress={() => toggleSubcategory(sub.id)}
                      style={[
                        styles.chipOption,
                        isChecked
                          ? { backgroundColor: "rgba(59, 130, 246, 0.2)", borderColor: "#3B82F6" }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.checkboxSquare,
                          isChecked ? { backgroundColor: "#3B82F6", borderColor: "#3B82F6" } : { borderColor: colors.textSubtle },
                        ]}
                      >
                        {isChecked && <Check size={12} color="#FFFFFF" />}
                      </View>
                      <Text
                        style={[
                          styles.chipOptionText,
                          { color: isChecked ? "#3B82F6" : colors.text },
                        ]}
                      >
                        {sub.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Media Attachments Section */}
          <View style={styles.fieldGroup}>
            <View style={styles.mediaHeaderRow}>
              <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>
                Media Attachments (
                {mediaItems.filter((m) => !deletedMediaIds.includes(m.id)).length +
                  pendingMedia.length}
                )
              </Text>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Pressable onPress={() => handlePickMoreMedia("camera")} style={styles.addMediaSmallBtn}>
                  <Camera size={14} color="#3B82F6" />
                  <Text style={styles.addMediaSmallBtnText}>Camera</Text>
                </Pressable>
                <Pressable onPress={() => handlePickMoreMedia("gallery")} style={styles.addMediaSmallBtn}>
                  <Plus size={14} color="#3B82F6" />
                  <Text style={styles.addMediaSmallBtnText}>Add Media</Text>
                </Pressable>
              </View>
            </View>

            {/* List of existing media (excluding those queued for deletion) */}
            <View style={styles.mediaGrid}>
              {mediaItems
                .filter((m) => !deletedMediaIds.includes(m.id))
                .map((m) => (
                  <View key={m.id} style={styles.mediaThumbnailWrapper}>
                    <Image source={{ uri: m.url }} style={styles.mediaThumbnail} contentFit="cover" />
                    {m.type === "video" && (
                      <View style={styles.videoBadge}>
                        <Film size={12} color="#FFFFFF" />
                      </View>
                    )}
                    <Pressable
                      onPress={() => handleDeleteExistingMedia(m.id)}
                      style={styles.deleteMediaThumbnailBtn}
                    >
                      <Trash2 size={12} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}

              {/* List of pending media */}
              {pendingMedia.map((pm, idx) => (
                <View key={`pending-${idx}`} style={styles.mediaThumbnailWrapper}>
                  <Image source={{ uri: pm.asset.uri }} style={styles.mediaThumbnail} contentFit="cover" />
                  {pm.type === "video" && (
                    <View style={styles.videoBadge}>
                      <Film size={12} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemovePendingMedia(idx)}
                    style={styles.deleteMediaThumbnailBtn}
                  >
                    <X size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Location</Text>
            {(latitude && longitude) || locationLinkUrl ? (
              <View style={[styles.locationCard, { backgroundColor: theme === "dark" ? colors.surface : "#F1F5F9", borderColor: colors.border }]}>
                <MapPin size={16} color="#10B981" />
                <Text style={[styles.locationCardText, { color: colors.text }]} numberOfLines={2}>
                  {latitude && longitude ? `📍 ${latitude}, ${longitude}` : `🔗 ${locationLinkUrl}`}
                </Text>
                <Pressable
                  onPress={() => {
                    setLatitude(null);
                    setLongitude(null);
                    setLocationLinkUrl(null);
                  }}
                  hitSlop={8}
                >
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.locationBtnRow}>
                <Pressable
                  onPress={handleGetLocation}
                  disabled={isLocating}
                  style={[styles.locationBtn, { borderColor: colors.border, backgroundColor: theme === "dark" ? colors.surface : "#FFFFFF" }]}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Navigation size={14} color={colors.text} />
                  )}
                  <Text style={[styles.locationBtnText, { color: colors.text }]}>
                    {isLocating ? "Getting location..." : "Use Current Location"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowLocationLinkField((v) => !v)}
                  style={[styles.locationBtn, { borderColor: colors.border, backgroundColor: theme === "dark" ? colors.surface : "#FFFFFF" }]}
                >
                  <Link2 size={14} color={colors.text} />
                  <Text style={[styles.locationBtnText, { color: colors.text }]}>Paste Link</Text>
                </Pressable>
              </View>
            )}
            {showLocationLinkField && !latitude && !locationLinkUrl && (
              <View style={[styles.locationLinkRow, { borderColor: colors.border }]}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                      flex: 1,
                    },
                  ]}
                  value={locationLinkInput}
                  onChangeText={setLocationLinkInput}
                  placeholder="Paste a maps link..."
                  placeholderTextColor={colors.textSubtle}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => {
                    const link = locationLinkInput.trim();
                    if (link) {
                      setLocationLinkUrl(link);
                      const m = link.match(/(?:search\/|@|q=|\?q=|destination=)([+-]?\d+(?:\.\d+)?)[,\s+]+([+-]?\d+(?:\.\d+)?)/);
                      if (m && m[1] && m[2]) {
                        setLatitude(m[1]);
                        setLongitude(m[2]);
                      } else {
                        setLatitude(null);
                        setLongitude(null);
                      }
                      setShowLocationLinkField(false);
                    }
                  }}
                  style={styles.locationLinkSaveBtn}
                >
                  <Text style={styles.locationLinkSaveBtnText}>Set</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Real-time Upload Progress card with byte-by-byte metrics and speed */}
          {isSaving && (
            <UploadProgress
              pct={uploadPct}
              loadedBytes={uploadLoadedBytes}
              totalBytes={uploadTotalBytes}
              isSubmitting={isSaving}
              stage={uploadStage}
              fileName={currentUploadFileName}
            />
          )}

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          >
            {isSaving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator color="#000000" size="small" />
                <Text style={styles.saveButtonText}>{savingProgress || "Saving..."}</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
    <AppDialogRenderer {...dialogState} onHide={hide} />
  </>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  multilineInput: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  posterPreviewContainer: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  posterPreview: {
    width: "100%",
    height: "100%",
  },
  posterActions: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
  },
  posterActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  posterActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadDropzone: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadDropzoneText: {
    fontSize: 13,
    fontWeight: "500",
  },
  checkboxGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkboxSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOptionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  mediaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  addMediaSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addMediaSmallBtnText: {
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "600",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mediaThumbnailWrapper: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  mediaThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 4,
    padding: 3,
  },
  newBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#3B82F6",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  deleteMediaThumbnailBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: "#FFFFFF",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  locationCardText: {
    flex: 1,
    fontSize: 13,
  },
  locationBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  locationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  locationBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  locationLinkRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  locationLinkSaveBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  locationLinkSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
