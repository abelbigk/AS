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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  X,
  Plus,
  ImagePlus,
  Film,
  Check,
  Search,
  Link,
  Upload,
  Camera,
  MapPin,
  Navigation,
  Link2,
} from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { uploadFile } from "../lib/upload";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import { AppToastRenderer, useAppToast } from "./AppToast";
import { ImagePickerToggle, type ImageValue } from "./ImagePickerToggle";
import { UploadProgress } from "./UploadProgress";

interface AddContentModalProps {
  visible: boolean;
  initialCategoryId?: number;
  initialSubcategoryId?: number;
  onClose: () => void;
  onContentAdded?: () => void;
}

export function AddContentModal({
  visible,
  initialCategoryId,
  initialSubcategoryId,
  onClose,
  onContentAdded,
}: AddContentModalProps) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const { dialogState, hide, showAlert } = useAppDialog();
  const { toastState, showToast } = useAppToast();

  const [activeTab, setActiveTab] = useState<"create" | "link">("create");

  // Create form state
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<number[]>([]);

  const [coverImage, setCoverImage] = useState<ImageValue | null>(null);
  const [mediaAssets, setMediaAssets] = useState<
    Array<{ asset: ImagePicker.ImagePickerAsset; type: "image" | "video" }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
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

  // Search existing state for link tab
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults = [], isLoading: searchLoading } =
    trpc.content.search.useQuery(
      { query: searchQuery.trim() },
      { enabled: visible && activeTab === "link" && searchQuery.trim().length > 0 }
    );

  const linkMutation = trpc.content.update.useMutation();
  const createMutation = trpc.content.create.useMutation();
  const addMediaMutation = trpc.media.add.useMutation();

  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
    enabled: visible,
  });
  const { data: allSubcategories = [] } = trpc.subcategories.listAll.useQuery(undefined, {
    enabled: visible,
  });

  useEffect(() => {
    if (visible) {
      setHeading("");
      setDescription("");
      setSelectedCategoryIds(initialCategoryId ? [initialCategoryId] : []);
      setSelectedSubcategoryIds(initialSubcategoryId ? [initialSubcategoryId] : []);
      setCoverImage(null);
      setMediaAssets([]);
      setIsSubmitting(false);
      setUploadStatus("");
      setSearchQuery("");
      setActiveTab("create");
      setLatitude(null);
      setLongitude(null);
      setLocationLinkUrl(null);
      setIsLocating(false);
      setLocationLinkInput("");
      setShowLocationLinkField(false);
    }
  }, [visible, initialCategoryId, initialSubcategoryId]);

  const toggleCategory = (catId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const toggleSubcategory = (subId: number) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handlePickMedia = async (source: "gallery" | "camera" = "gallery") => {
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
        setMediaAssets((prev) => [...prev, ...newItems]);
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
        showAlert("Permission Denied", "Location permission is required to fetch coordinates.");
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

  const handleRemoveMedia = (index: number) => {
    setMediaAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async () => {
    if (!heading.trim()) {
      showAlert("Validation", "Heading is required");
      return;
    }

    setIsSubmitting(true);
    setUploadStatus("Creating content...");
    setUploadStage("cover");

    try {
      let posterUrl: string | undefined = undefined;
      let posterKey: string | undefined = undefined;

      if (coverImage) {
        if (coverImage.isUrl) {
          posterUrl = coverImage.uri;
        } else if (coverImage.asset) {
          setUploadStage("cover");
          const fName = coverImage.asset.fileName || `cover_${Date.now()}.jpg`;
          setCurrentUploadFileName(fName);
          setUploadStatus("Uploading cover image...");
          const res = await uploadFile(
            coverImage.asset.uri,
            fName,
            coverImage.asset.mimeType || "image/jpeg",
            (loaded, total) => {
              setUploadLoadedBytes(loaded);
              setUploadTotalBytes(total);
              setUploadPct(Math.round((loaded / total) * 100));
            }
          );
          if (res) {
            posterUrl = res.url;
            posterKey = res.key;
          }
        }
      }

      setUploadStage("saving_entry");
      setUploadStatus("Saving details...");
      const finalLocationLink = locationLinkUrl || (locationLinkInput.trim() || undefined);
      const newItem = await createMutation.mutateAsync({
        heading: heading.trim(),
        description: description.trim() || undefined,
        categoryIds: selectedCategoryIds,
        subcategoryIds: selectedSubcategoryIds,
        posterImageUrl: posterUrl,
        posterImageKey: posterKey,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        locationLinkUrl: finalLocationLink,
      });

      if (newItem && mediaAssets.length > 0) {
        setUploadStage("media");
        for (let i = 0; i < mediaAssets.length; i++) {
          const itemMedia = mediaAssets[i];
          const ext = itemMedia.type === "video" ? "mp4" : "jpg";
          let mName = itemMedia.asset.fileName || `media_${Date.now()}_${i}.${ext}`;
          if (!mName.includes(".")) mName = `${mName}.${ext}`;
          setCurrentUploadFileName(mName);
          setUploadPct(0);
          setUploadStatus(`Uploading media ${i + 1} of ${mediaAssets.length}...`);
          const res = await uploadFile(
            itemMedia.asset.uri,
            mName,
            itemMedia.asset.mimeType || (itemMedia.type === "video" ? "video/mp4" : "image/jpeg"),
            (loaded, total) => {
              setUploadLoadedBytes(loaded);
              setUploadTotalBytes(total);
              setUploadPct(Math.round((loaded / total) * 100));
            }
          );

          if (res) {
            await addMediaMutation.mutateAsync({
              contentItemId: newItem.id,
              url: res.url,
              key: res.key,
              type: itemMedia.type,
              order: i,
            });
          }
        }
      }

      setUploadStage("idle");

      if (initialCategoryId) utils.content.listByCategory.invalidate({ categoryId: initialCategoryId });
      if (initialSubcategoryId) utils.content.listBySubcategory.invalidate({ subcategoryId: initialSubcategoryId });
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();

      onContentAdded?.();
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to create content", "error");
    } finally {
      setIsSubmitting(false);
      setUploadStatus("");
    }
  };

  const handleLinkItem = async (existingItem: any) => {
    try {
      setIsSubmitting(true);
      const catIds = new Set<number>((existingItem.categoryIds || []) as number[]);
      const subIds = new Set<number>((existingItem.subcategoryIds || []) as number[]);

      if (initialCategoryId) catIds.add(initialCategoryId);
      if (initialSubcategoryId) subIds.add(initialSubcategoryId);

      await linkMutation.mutateAsync({
        itemId: existingItem.id,
        categoryIds: Array.from(catIds),
        subcategoryIds: Array.from(subIds),
      });

      if (initialCategoryId) utils.content.listByCategory.invalidate({ categoryId: initialCategoryId });
      if (initialSubcategoryId) utils.content.listBySubcategory.invalidate({ subcategoryId: initialSubcategoryId });
      utils.content.listByStatus.invalidate();

      showToast("Content linked successfully", "success");
      onContentAdded?.();
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to link content", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme === "dark" ? "#0A0A0A" : "#FFFFFF",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Content</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Tab switcher: Create New vs Link Existing */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => setActiveTab("create")}
            style={[
              styles.tabItem,
              activeTab === "create" && { borderBottomColor: colors.text, borderBottomWidth: 2 },
            ]}
          >
            <Upload size={14} color={activeTab === "create" ? colors.text : colors.textSubtle} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "create" ? colors.text : colors.textSubtle },
              ]}
            >
              Create New
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("link")}
            style={[
              styles.tabItem,
              activeTab === "link" && { borderBottomColor: colors.text, borderBottomWidth: 2 },
            ]}
          >
            <Link size={14} color={activeTab === "link" ? colors.text : colors.textSubtle} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "link" ? colors.text : colors.textSubtle },
              ]}
            >
              Link Existing
            </Text>
          </Pressable>
        </View>

        {activeTab === "create" ? (
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
                numberOfLines={3}
              />
            </View>

            {/* Cover Poster Image */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Cover Image</Text>
              <ImagePickerToggle
                label="Attach Cover Image"
                currentImageUrl={coverImage?.uri}
                onImageSelected={setCoverImage}
              />
            </View>

            {/* Categories Multi-Select — hidden when initialCategoryId is preset */}
            {!initialCategoryId && categories.length > 0 && (
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

            {/* Subcategories — hidden when initialSubcategoryId is preset; label omits "Optional" when inside a subcategory context */}
            {!initialSubcategoryId && allSubcategories.length > 0 && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  {initialCategoryId ? "Subcategory" : "Subcategories (Optional)"}
                </Text>
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
                  Media Gallery ({mediaAssets.length})
                </Text>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <Pressable onPress={() => handlePickMedia("camera")} style={styles.addMediaSmallBtn}>
                    <Camera size={14} color="#3B82F6" />
                    <Text style={styles.addMediaSmallBtnText}>Camera</Text>
                  </Pressable>
                  <Pressable onPress={() => handlePickMedia("gallery")} style={styles.addMediaSmallBtn}>
                    <Plus size={14} color="#3B82F6" />
                    <Text style={styles.addMediaSmallBtnText}>Add Media</Text>
                  </Pressable>
                </View>
              </View>

              {mediaAssets.length > 0 && (
                <View style={styles.mediaGrid}>
                  {mediaAssets.map((item, idx) => (
                    <View key={`media-${idx}`} style={styles.mediaThumbnailWrapper}>
                      <Image source={{ uri: item.asset.uri }} style={styles.mediaThumbnail} contentFit="cover" />
                      {item.type === "video" && (
                        <View style={styles.videoBadge}>
                          <Film size={12} color="#FFFFFF" />
                        </View>
                      )}
                      <Pressable
                        onPress={() => handleRemoveMedia(idx)}
                        style={styles.deleteMediaThumbnailBtn}
                      >
                        <X size={12} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Location Section */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Location</Text>
              {(latitude && longitude) || locationLinkUrl ? (
                <View style={[styles.locationCard, { backgroundColor: theme === "dark" ? colors.surface : "#F1F5F9", borderColor: colors.border }]}>
                  <MapPin size={16} color="#10B981" />
                  <Text style={[styles.locationCardText, { color: colors.text }]} numberOfLines={2}>
                    {latitude && longitude ? `📍 Coordinates: ${latitude}, ${longitude}` : `🔗 ${locationLinkUrl}`}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setLatitude(null);
                      setLongitude(null);
                      setLocationLinkUrl(null);
                      setLocationLinkInput("");
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
                        // Auto-extract coordinates if in URL
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
            {isSubmitting && (
              <UploadProgress
                pct={uploadPct}
                loadedBytes={uploadLoadedBytes}
                totalBytes={uploadTotalBytes}
                isSubmitting={isSubmitting}
                stage={uploadStage}
                fileName={currentUploadFileName}
              />
            )}

            {/* Submit Button */}
            <Pressable
              onPress={handleCreateSubmit}
              disabled={isSubmitting}
              style={[styles.saveButton, isSubmitting && { opacity: 0.6 }]}
            >
              {isSubmitting ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator color="#000000" size="small" />
                  <Text style={styles.saveButtonText}>{uploadStatus || "Creating..."}</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Create Content</Text>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          /* Link Existing Content Tab */
          <View style={styles.linkContainer}>
            <View style={[styles.searchBar, { borderColor: colors.border }]}>
              <Search size={16} color={colors.textSubtle} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search existing items to link..."
                placeholderTextColor={colors.textSubtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <X size={16} color={colors.textSubtle} />
                </Pressable>
              )}
            </View>

            {searchLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : searchResults.length > 0 ? (
              <ScrollView style={styles.searchResultsList}>
                {searchResults.map((result: any) => (
                  <View
                    key={result.id}
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                  >
                    {result.posterImageUrl ? (
                      <Image
                        source={{ uri: result.posterImageUrl }}
                        style={styles.resultPoster}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.resultPosterPlaceholder, { backgroundColor: colors.surface }]}>
                        <Film size={16} color={colors.textSubtle} />
                      </View>
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultHeading, { color: colors.text }]} numberOfLines={1}>
                        {result.heading}
                      </Text>
                      {result.description ? (
                        <Text style={[styles.resultDesc, { color: colors.textMuted }]} numberOfLines={1}>
                          {result.description}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => handleLinkItem(result)}
                      disabled={isSubmitting}
                      style={styles.linkActionBtn}
                    >
                      <Text style={styles.linkActionBtnText}>Link</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptySearchBox}>
                <Text style={[styles.emptySearchText, { color: colors.textMuted }]}>
                  {searchQuery.trim().length > 0
                    ? "No matching items found"
                    : "Type above to search existing content"}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
    <AppDialogRenderer {...dialogState} onHide={hide} />
    <AppToastRenderer {...toastState} />
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
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
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  posterPreviewContainer: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  posterPreview: {
    width: "100%",
    height: "100%",
  },
  removePosterBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadDropzone: {
    height: 90,
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
    width: 85,
    height: 85,
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
  linkContainer: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  searchResultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultPoster: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  resultPosterPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultHeading: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultDesc: {
    fontSize: 12,
  },
  linkActionBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linkActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptySearchBox: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptySearchText: {
    fontSize: 14,
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
