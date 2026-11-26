import React, { useState, useEffect, useMemo } from "react";
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
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  X,
  ImagePlus,
  Film,
  Check,
  Camera,
  MapPin,
  Navigation,
  Link2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
  const utils = trpc.useUtils();
  const { dialogState, hide, showAlert } = useAppDialog();
  const { toastState, showToast } = useAppToast();

  // Create form state
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<number[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [coverImage, setCoverImage] = useState<ImageValue | null>(null);
  const [mediaAssets, setMediaAssets] = useState<
    Array<{ asset: ImagePicker.ImagePickerAsset; type: "image" | "video" }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadLoadedBytes, setUploadLoadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "cover" | "saving_entry" | "media" | "processing"
  >("idle");
  const [currentUploadFileName, setCurrentUploadFileName] = useState("Media file");

  // Location state
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [locationLinkUrl, setLocationLinkUrl] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationLinkInput, setLocationLinkInput] = useState("");
  const [showLocationLinkField, setShowLocationLinkField] = useState(false);

  // Link Existing Content state (20 items initial, load more on scroll; full search when query non-empty)
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleLinkCount, setVisibleLinkCount] = useState(20);

  const linkEnabled = visible && !!(initialCategoryId || initialSubcategoryId);
  const { data: searchResults = [], isLoading: searchLoading } =
    trpc.content.search.useQuery(
      { query: searchQuery.trim() },
      { enabled: linkEnabled }
    );

  // Fallback list when server search returns [] for empty query
  const { data: defaultItems = [] } = trpc.content.listByStatus.useQuery("default", {
    enabled: linkEnabled && searchQuery.trim().length === 0,
  });
  const { data: queuedItems = [] } = trpc.content.listByStatus.useQuery("queued", {
    enabled: linkEnabled && searchQuery.trim().length === 0,
  });
  const { data: doneItems = [] } = trpc.content.listByStatus.useQuery("done", {
    enabled: linkEnabled && searchQuery.trim().length === 0,
  });

  const allExistingCandidates = useMemo(() => {
    if (searchQuery.trim().length > 0 || searchResults.length > 0) {
      return searchResults;
    }
    const merged = [...defaultItems, ...queuedItems, ...doneItems];
    const seen = new Set<number>();
    return merged.filter((item: any) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [searchQuery, searchResults, defaultItems, queuedItems, doneItems]);

  const linkMutation = trpc.content.create.useMutation();
  const createMutation = trpc.content.create.useMutation();
  const addMediaMutation = trpc.media.add.useMutation();

  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
    enabled: visible,
  });
  const { data: allSubcategories = [] } = trpc.subcategories.listAll.useQuery(undefined, {
    enabled: visible,
  });
  const { data: existingContent } = trpc.content.searchExisting.useQuery(
    { heading: heading.trim() },
    { enabled: visible && heading.trim().length > 2 }
  );

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.id - b.id);
  }, [categories]);

  const activeSubcategories = useMemo(() => {
    const catSet = new Set(selectedCategoryIds);
    if (initialCategoryId) catSet.add(initialCategoryId);
    return allSubcategories.filter(
      (s) => catSet.has(s.categoryId) || selectedSubcategoryIds.includes(s.id)
    );
  }, [allSubcategories, selectedCategoryIds, initialCategoryId, selectedSubcategoryIds]);

  const availableSearchResults = useMemo(() => {
    return allExistingCandidates.filter((item: any) => {
      // When inside a subcategory, check ONLY that subcategory (not parent category)
      const isLinked = initialSubcategoryId
        ? item.subcategoryIds?.includes(initialSubcategoryId)
        : initialCategoryId
          ? item.categoryIds?.includes(initialCategoryId)
          : false;
      return !isLinked;
    });
  }, [allExistingCandidates, initialCategoryId, initialSubcategoryId]);

  const displayedLinkResults = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return availableSearchResults;
    }
    return availableSearchResults.slice(0, visibleLinkCount);
  }, [availableSearchResults, searchQuery, visibleLinkCount]);

  useEffect(() => {
    if (visible) {
      setHeading("");
      setDescription("");
      setSelectedCategoryIds(initialCategoryId ? [initialCategoryId] : []);
      setSelectedSubcategoryIds(initialSubcategoryId ? [initialSubcategoryId] : []);
      setCategoriesOpen(false);
      setCoverImage(null);
      setMediaAssets([]);
      setIsSubmitting(false);
      setUploadStatus("");
      setSearchQuery("");
      setVisibleLinkCount(20);
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
    const isChecking = !selectedSubcategoryIds.includes(subId);
    setSelectedSubcategoryIds((prev) =>
      isChecking ? [...prev, subId] : prev.filter((id) => id !== subId)
    );
    if (isChecking) {
      const sub = allSubcategories.find((s) => s.id === subId);
      if (sub) {
        setSelectedCategoryIds((prev) => prev.filter((id) => id !== sub.categoryId));
      }
    }
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
    if (selectedCategoryIds.length === 0 && selectedSubcategoryIds.length === 0) {
      showAlert("Validation", "Please select at least one category or subcategory");
      return;
    }
    if (!heading.trim()) {
      showAlert("Validation", "Heading is required");
      return;
    }

    setIsSubmitting(true);
    setUploadStatus(existingContent ? "Linking content..." : "Creating content...");
    setUploadStage(existingContent ? "saving_entry" : "cover");

    try {
      if (existingContent) {
        await createMutation.mutateAsync({
          heading: heading.trim(),
          categoryIds: selectedCategoryIds,
          subcategoryIds: selectedSubcategoryIds,
        });
      } else {
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
          posterCropData: coverImage?.cropData ? JSON.stringify(coverImage.cropData) : undefined,
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
      }

      setUploadStage("idle");
      if (initialCategoryId) utils.content.listByCategory.invalidate({ categoryId: initialCategoryId });
      if (initialSubcategoryId) utils.content.listBySubcategory.invalidate({ subcategoryId: initialSubcategoryId });
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();

      showToast("Content added!", "success");
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
    if (selectedCategoryIds.length === 0 && selectedSubcategoryIds.length === 0) {
      showAlert("Validation", "Please select at least one category or subcategory");
      return;
    }
    try {
      setIsSubmitting(true);
      await linkMutation.mutateAsync({
        categoryIds: selectedCategoryIds,
        subcategoryIds: selectedSubcategoryIds,
        heading: existingItem.heading,
      });

      if (initialCategoryId) utils.content.listByCategory.invalidate({ categoryId: initialCategoryId });
      if (initialSubcategoryId) utils.content.listBySubcategory.invalidate({ subcategoryId: initialSubcategoryId });
      utils.content.listByStatus.invalidate();
      utils.content.search.invalidate();

      showToast("Content linked!", "success");
      onContentAdded?.();
    } catch (err: any) {
      showToast(err?.message || "Failed to link content", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScroll = (e: any) => {
    if (searchQuery.trim().length > 0) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
    if (isNearBottom && visibleLinkCount < availableSearchResults.length) {
      setVisibleLinkCount((prev) => prev + 20);
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
            {/* Header matching Add Content screenshot */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Content</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Upload photos, videos or link existing items
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={150}
            >
              {/* Categories Dropdown (hidden when initialCategoryId is preset) */}
              {!initialCategoryId && sortedCategories.length > 0 && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Categories</Text>
                  <Pressable
                    onPress={() => setCategoriesOpen((v) => !v)}
                    style={[
                      styles.dropdownTrigger,
                      { borderColor: colors.border, backgroundColor: inputBg },
                    ]}
                  >
                    <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>
                      {selectedCategoryIds.length === 0
                        ? "Select categories..."
                        : `${selectedCategoryIds.length} selected`}
                    </Text>
                    {categoriesOpen ? (
                      <ChevronUp size={16} color={colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={colors.textMuted} />
                    )}
                  </Pressable>
                  {categoriesOpen && (
                    <View
                      style={[
                        styles.dropdownMenu,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                      ]}
                    >
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {sortedCategories.map((cat) => {
                          const isChecked = selectedCategoryIds.includes(cat.id);
                          return (
                            <Pressable
                              key={cat.id}
                              onPress={() => toggleCategory(cat.id)}
                              style={[
                                styles.dropdownItem,
                                isChecked && { backgroundColor: "rgba(59, 130, 246, 0.12)" },
                              ]}
                            >
                              <View
                                style={[
                                  styles.checkboxSquare,
                                  isChecked
                                    ? { backgroundColor: theme === "dark" ? "#FFFFFF" : "#111827", borderColor: "transparent" }
                                    : { borderColor: colors.textSubtle },
                                ]}
                              >
                                {isChecked && (
                                  <Check size={12} color={theme === "dark" ? "#000000" : "#FFFFFF"} />
                                )}
                              </View>
                              <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                                {cat.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Subcategories pills */}
              {!initialSubcategoryId && activeSubcategories.length > 0 && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Subcategories (Optional)
                  </Text>
                  <View style={styles.checkboxGroup}>
                    {activeSubcategories.map((sub) => {
                      const isChecked = selectedSubcategoryIds.includes(sub.id);
                      return (
                        <Pressable
                          key={sub.id}
                          onPress={() => toggleSubcategory(sub.id)}
                          style={[
                            styles.badgePill,
                            isChecked
                              ? { backgroundColor: "rgba(59, 130, 246, 0.2)", borderColor: "#3B82F6" }
                              : { backgroundColor: colors.surface, borderColor: colors.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgePillText,
                              { color: isChecked ? "#3B82F6" : colors.textMuted },
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

              {/* Heading */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Heading</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, backgroundColor: inputBg },
                  ]}
                  value={heading}
                  onChangeText={setHeading}
                  placeholder="e.g., Inception"
                  placeholderTextColor={colors.textSubtle}
                />
                {existingContent && (
                  <View style={styles.existingBanner}>
                    <AlertCircle size={16} color="#3B82F6" />
                    <Text style={styles.existingBannerText}>
                      Existing content found. We&apos;ll link it to the selected categories.
                    </Text>
                  </View>
                )}
              </View>

              {!existingContent && (
                <>
                  {/* Description */}
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
                      placeholder="Add notes..."
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
                      frameHeight={180}
                      onImageSelected={setCoverImage}
                    />
                  </View>

                  {/* Photos & Videos grid matching screenshot */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.mediaHeaderRow}>
                      <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>
                        Photos &amp; Videos
                      </Text>
                      <Pressable
                        onPress={() => handlePickMedia("camera")}
                        style={styles.cameraSmallBtn}
                      >
                        <Camera size={14} color="#3B82F6" />
                        <Text style={styles.cameraSmallBtnText}>Camera</Text>
                      </Pressable>
                    </View>
                    <View style={styles.mediaGrid}>
                      {mediaAssets.map((item, idx) => (
                        <View key={`media-${idx}`} style={styles.mediaThumbnailWrapper}>
                          <Image
                            source={{ uri: item.asset.uri }}
                            style={styles.mediaThumbnail}
                            contentFit="cover"
                          />
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
                      <Pressable
                        onPress={() => handlePickMedia("gallery")}
                        style={[
                          styles.addMediaDashedBox,
                          { borderColor: colors.border },
                        ]}
                      >
                        <ImagePlus size={22} color={colors.textSubtle} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Location Section */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Location (Optional)</Text>
                    {(latitude && longitude) || locationLinkUrl ? (
                      <View
                        style={[
                          styles.locationCard,
                          {
                            backgroundColor: theme === "dark" ? colors.surface : "#F1F5F9",
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <MapPin size={16} color="#10B981" />
                        <Text style={[styles.locationCardText, { color: colors.text }]} numberOfLines={2}>
                          {latitude && longitude
                            ? `📍 Coordinates: ${latitude}, ${longitude}`
                            : `🔗 ${locationLinkUrl}`}
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
                          style={[
                            styles.locationBtn,
                            { borderColor: colors.border, backgroundColor: inputBg },
                          ]}
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
                          style={[
                            styles.locationBtn,
                            { borderColor: colors.border, backgroundColor: inputBg },
                          ]}
                        >
                          <Link2 size={14} color={colors.text} />
                          <Text style={[styles.locationBtnText, { color: colors.text }]}>
                            Paste Link
                          </Text>
                        </Pressable>
                      </View>
                    )}
                    {showLocationLinkField && !latitude && !locationLinkUrl && (
                      <View style={styles.locationLinkRow}>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: inputBg,
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
                              const m = link.match(
                                /(?:search\/|@|q=|\?q=|destination=)([+-]?\d+(?:\.\d+)?)[,\s+]+([+-]?\d+(?:\.\d+)?)/
                              );
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
                </>
              )}

              {isSubmitting && uploadTotalBytes > 0 && (
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
                style={[
                  styles.saveButton,
                  { backgroundColor: theme === "dark" ? "#FFFFFF" : "#111827" },
                  isSubmitting && { opacity: 0.6 },
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator
                      color={theme === "dark" ? "#000000" : "#FFFFFF"}
                      size="small"
                    />
                    <Text
                      style={[
                        styles.saveButtonText,
                        { color: theme === "dark" ? "#000000" : "#FFFFFF" },
                      ]}
                    >
                      {uploadStatus || "Saving..."}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.saveButtonText,
                      { color: theme === "dark" ? "#000000" : "#FFFFFF" },
                    ]}
                  >
                    {existingContent ? "Link Existing Content" : "Add Content"}
                  </Text>
                )}
              </Pressable>

              {/* LINK EXISTING CONTENT section below divider (matching screenshot & AddContentForm.tsx) */}
              {(initialCategoryId || initialSubcategoryId) && (
                <View style={[styles.linkSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.linkSectionTitle, { color: colors.text }]}>
                    LINK EXISTING CONTENT
                  </Text>
                  <Text style={[styles.linkSectionSub, { color: colors.textMuted }]}>
                    Select from your other categories
                  </Text>

                  <TextInput
                    style={[
                      styles.searchInput,
                      { color: colors.text, borderColor: colors.border, backgroundColor: inputBg },
                    ]}
                    placeholder="Search items to link..."
                    placeholderTextColor={colors.textSubtle}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />

                  {searchLoading ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                  ) : displayedLinkResults.length > 0 ? (
                    <View style={styles.linkList}>
                      {displayedLinkResults.map((item: any) => {
                        const total =
                          (item.categoryIds?.length || 0) + (item.subcategoryIds?.length || 0);
                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.resultItem,
                              { borderColor: colors.border, backgroundColor: colors.surface },
                            ]}
                          >
                            {item.posterImageUrl ? (
                              <Image
                                source={{ uri: item.posterImageUrl }}
                                style={styles.resultPoster}
                                contentFit="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.resultPosterPlaceholder,
                                  { backgroundColor: inputBg },
                                ]}
                              >
                                <Film size={16} color={colors.textSubtle} />
                              </View>
                            )}
                            <View style={styles.resultInfo}>
                              <Text
                                style={[styles.resultHeading, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {item.heading}
                              </Text>
                              <Text style={[styles.resultCollections, { color: colors.textMuted }]}>
                                {total === 1 ? "1 collection" : `${total} collections`}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => handleLinkItem(item)}
                              disabled={isSubmitting}
                              style={[
                                styles.linkActionBtn,
                                { borderColor: colors.border, backgroundColor: inputBg },
                              ]}
                            >
                              <Text style={[styles.linkActionBtnText, { color: colors.text }]}>
                                Add
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                      {!searchQuery.trim() && visibleLinkCount < availableSearchResults.length && (
                        <Pressable
                          onPress={() => setVisibleLinkCount((prev) => prev + 20)}
                          style={styles.loadMoreBtn}
                        >
                          <Text style={[styles.loadMoreText, { color: colors.textMuted }]}>
                            Showing {displayedLinkResults.length} of {availableSearchResults.length} · Tap or scroll for more
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.emptySearchText, { color: colors.textMuted }]}>
                      {searchQuery.trim().length > 0
                        ? "No matching items found"
                        : "All your content is already linked here"}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <AppDialogRenderer {...dialogState} onHide={hide} />
      <AppToastRenderer {...toastState} />
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
  fieldGroup: {
    marginBottom: 16,
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
    height: 76,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  dropdownTrigger: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTriggerText: {
    fontSize: 14,
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkboxSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  existingBanner: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  existingBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#60A5FA",
  },
  mediaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cameraSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cameraSmallBtnText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "600",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaThumbnailWrapper: {
    width: 88,
    height: 88,
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
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addMediaDashedBox: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  locationCardText: {
    flex: 1,
    fontSize: 13,
  },
  locationBtnRow: {
    flexDirection: "row",
    gap: 8,
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
  saveButton: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 8,
  },
  linkSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  linkSectionSub: {
    fontSize: 11,
    marginBottom: 4,
  },
  searchInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 6,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  linkList: {
    gap: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
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
  resultCollections: {
    fontSize: 11,
  },
  linkActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadMoreBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: 11,
  },
  emptySearchText: {
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 12,
  },
});
