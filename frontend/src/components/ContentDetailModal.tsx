import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
  Linking,
  Image as RNImage,
  BackHandler,
  Animated,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2,
  FolderMinus,
  Calendar,
  Images,
  Film,
  Music,
  Download,
  MapPin,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react-native";
import { format } from "date-fns";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { DropdownMenu } from "./DropdownMenu";
import { CroppedImage } from "./CroppedImage";
import { EditContentModal } from "./EditContentModal";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import { SoundControl } from "./SoundControl";
import { SoundPickerModal } from "./SoundPickerModal";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { SkeletonShimmer } from "./SkeletonShimmer";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import type { ContentItem } from "./ContentCard";

interface ContentDetailModalProps {
  item: ContentItem | null;
  visible: boolean;
  activeCategoryId?: number;
  activeSubcategoryId?: number;
  onClose: () => void;
  onDeleted?: () => void;
  onRemoveFromCategory?: () => void;
  onRemoveFromSubcategory?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function ModalMediaImage({
  uri,
  onAspectRatio,
}: {
  uri: string;
  onAspectRatio: (ratio: number) => void;
}) {
  const skeletonOpacity = useRef(new Animated.Value(1)).current;

  return (
    <>
      <Image
        source={{ uri }}
        style={styles.imageFrameless}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        onLoad={(e) => {
          Animated.timing(skeletonOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
          if (e.source.width && e.source.height) {
            onAspectRatio(e.source.width / e.source.height);
          }
        }}
      />
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: skeletonOpacity }]}
        pointerEvents="none"
      >
        <SkeletonShimmer style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}

export function ContentDetailView({
  item,
  visible = true,
  activeCategoryId,
  activeSubcategoryId,
  onClose,
  onDeleted,
  onRemoveFromCategory,
  onRemoveFromSubcategory,
}: Omit<ContentDetailModalProps, "visible"> & { visible?: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { dialogState, hide, showConfirm } = useAppDialog();
  const utils = trpc.useUtils();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [coverAspectRatio, setCoverAspectRatio] = useState<number | undefined>(undefined);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<number, number>>({});
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [activeSound, setActiveSound] = useState<{ id: number; url: string; title: string; name?: string | null } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const [isVideoUserPaused, setIsVideoUserPaused] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(Math.min(SCREEN_WIDTH - 32, 640));
  const sliderHeight = Math.min(540, Math.round(SCREEN_HEIGHT * 0.65));
  const [isVideoTimelineDragging, setIsVideoTimelineDragging] = useState(false);
  const [isScrolledPastMedia, setIsScrolledPastMedia] = useState(false);
  const [fullscreenMediaIndex, setFullscreenMediaIndex] = useState<number | null>(null);
  const [fullscreenWidth, setFullscreenWidth] = useState(SCREEN_WIDTH);
  const scrollViewRef = useRef<any>(null);
  const fullscreenScrollRef = useRef<any>(null);
  const inlinePinchHandledRef = useRef(false);
  const fsPinchHandledRef = useRef(false);
  const fsHeaderVisibleRef = useRef(false);
  const fsHeaderOpacity = useRef(new Animated.Value(0)).current;
  const [fsHeaderPointerEvents, setFsHeaderPointerEvents] = useState<"none" | "auto">("none");
  const mediaItemsRef = useRef<Array<{ id: string | number; type: string; url: string }>>([]);
  const isFullscreenRef = useRef(false);
  isFullscreenRef.current = fullscreenMediaIndex !== null;
  const videoPlaybackMapRef = useRef<Record<string, { time: number; isPlaying: boolean }>>({});
  const [videoSyncState, setVideoSyncState] = useState<{
    url: string;
    time: number;
    isPlaying: boolean;
    version: number;
  } | null>(null);

  const setFullscreenControlsVisible = useCallback((show: boolean) => {
    fsHeaderVisibleRef.current = show;
    fsHeaderOpacity.setValue(show ? 1 : 0);
    setFsHeaderPointerEvents(show ? "auto" : "none");
  }, [fsHeaderOpacity]);

  const toggleFullscreenControls = useCallback(() => {
    setFullscreenControlsVisible(!fsHeaderVisibleRef.current);
  }, [setFullscreenControlsVisible]);

  const openFullscreen = useCallback((index: number) => {
    isFullscreenRef.current = true;
    const item = mediaItemsRef.current[index];
    if (item && item.type === "video") {
      const snap = videoPlaybackMapRef.current[item.url];
      if (snap) {
        setVideoSyncState((prev) => ({
          url: item.url,
          time: snap.time,
          isPlaying: snap.isPlaying,
          version: (prev?.version ?? 0) + 1,
        }));
      }
    }
    setFullscreenControlsVisible(false);
    setFullscreenMediaIndex(index);
  }, [setFullscreenControlsVisible]);

  const closeFullscreen = useCallback(() => {
    isFullscreenRef.current = false;
    const targetIndex = fullscreenMediaIndex;
    if (targetIndex !== null) {
      const item = mediaItemsRef.current[targetIndex];
      if (item && item.type === "video") {
        const snap = videoPlaybackMapRef.current[item.url];
        if (snap) {
          setVideoSyncState((prev) => ({
            url: item.url,
            time: snap.time,
            isPlaying: snap.isPlaying,
            version: (prev?.version ?? 0) + 1,
          }));
        }
      }
    }
    setFullscreenMediaIndex(null);
    if (targetIndex !== null && sliderWidth > 0) {
      setActiveMediaIndex(targetIndex);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          x: targetIndex * sliderWidth,
          animated: false,
        });
      });
    }
  }, [fullscreenMediaIndex, sliderWidth]);

  // Android hardware Back button: exits fullscreen media viewer before modal
  useEffect(() => {
    if (fullscreenMediaIndex === null) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeFullscreen();
      return true;
    });
    return () => sub.remove();
  }, [fullscreenMediaIndex, closeFullscreen]);

  // Web Escape key listener: exits fullscreen media viewer
  useEffect(() => {
    if (Platform.OS !== "web" || fullscreenMediaIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreenMediaIndex, closeFullscreen]);

  // Single round-trip: fetch item + its media together so everything renders at once
  const { data: freshData, refetch } = trpc.content.getByIdWithMedia.useQuery(
    { itemId: item?.id || 0 },
    { enabled: !!item?.id && visible }
  );
  const { refreshControlProps } = usePullToRefresh(refetch);

  // Guard against stale query cache from a previously opened item
  const freshItem = (freshData && freshData.id === item?.id) ? freshData : null;
  const displayItem = freshItem ?? item;

  // Media comes from the combined query — zero extra round-trips
  const mediaItems = useMemo(() => {
    if (!freshItem?.media || freshItem.id !== item?.id) return [];
    return freshItem.media.filter((m: any) => m.contentItemId === item?.id);
  }, [freshItem, item?.id]);
  mediaItemsRef.current = mediaItems;

  // Reset all item-specific state whenever a different item is opened or modal becomes visible
  useEffect(() => {
    if (visible && item?.id) {
      setActiveMediaIndex(0);
      setActiveSound((item as any)?.sound ?? null);
      setIsVideoPlaying(false);
      setIsVideoBuffering(false);
      setIsVideoUserPaused(false);
      setIsVideoTimelineDragging(false);
      setIsScrolledPastMedia(false);
      setCoverAspectRatio(undefined);
      setMediaAspectRatios({});
      setFullscreenMediaIndex(null);
      videoPlaybackMapRef.current = {};
      setVideoSyncState(null);
      try {
        scrollViewRef.current?.scrollTo({ x: 0, animated: false });
      } catch {}
    }
  }, [item?.id, visible]);

  // Sync activeSound if freshItem loads for THIS item
  useEffect(() => {
    if (freshItem && freshItem.id === item?.id) {
      setActiveSound((freshItem as any).sound ?? null);
    }
  }, [freshItem, item?.id]);

  // Prefetch natural aspect ratios for images immediately
  useEffect(() => {
    if (!mediaItems || mediaItems.length === 0) return;
    mediaItems.forEach((m) => {
      if (m.type !== "video" && m.url) {
        if (Platform.OS === "web") {
          try {
            const img = new (window as any).Image();
            img.src = m.url;
            img.onload = () => {
              if (img.naturalWidth && img.naturalHeight) {
                setMediaAspectRatios((prev) => ({
                  ...prev,
                  [m.id]: img.naturalWidth / img.naturalHeight,
                }));
              }
            };
          } catch {}
        } else {
          RNImage.getSize(
            m.url,
            (w, h) => {
              if (w && h) {
                setMediaAspectRatios((prev) => ({
                  ...prev,
                  [m.id]: w / h,
                }));
              }
            },
            () => {}
          );
        }
      }
    });
  }, [mediaItems]);

  const displaySound = activeSound ?? (freshItem as any)?.sound ?? (item as any)?.sound ?? null;

  // Safe clamped index to ensure counter and dots never display out-of-bounds (e.g. 4/2)
  const displayMediaIndex = mediaItems.length > 0
    ? Math.min(activeMediaIndex, mediaItems.length - 1)
    : 0;

  const displayMediaIndexRef = useRef(displayMediaIndex);
  displayMediaIndexRef.current = displayMediaIndex;

  const inlinePinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onBegin(() => {
          inlinePinchHandledRef.current = false;
        })
        .onUpdate((e) => {
          if (!inlinePinchHandledRef.current && e.scale > 1.15) {
            inlinePinchHandledRef.current = true;
            openFullscreen(displayMediaIndexRef.current);
          }
        }),
    [openFullscreen]
  );

  const fullscreenPinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onBegin(() => {
          fsPinchHandledRef.current = false;
        })
        .onUpdate((e) => {
          if (!fsPinchHandledRef.current && e.scale < 0.85) {
            fsPinchHandledRef.current = true;
            closeFullscreen();
          }
        }),
    [closeFullscreen]
  );

  const hasLocation =
    !!(displayItem?.latitude && displayItem?.longitude) ||
    !!displayItem?.locationLinkUrl;

  const handleLocationPress = () => {
    if (!hasLocation) return;
    showConfirm({
      title: "Navigate to Location",
      message: "Would you like to navigate to this location?",
      confirmText: "Navigate",
      destructive: false,
      onConfirm: () => {
        let lat = displayItem?.latitude;
        let lng = displayItem?.longitude;
        const link = displayItem?.locationLinkUrl;

        // If coordinates aren't stored, but link contains them, extract immediately
        if ((!lat || !lng) && link) {
          const m = link.match(/(?:search\/|@|q=|\?q=|destination=)([+-]?\d+(?:\.\d+)?)[,\s+]+([+-]?\d+(?:\.\d+)?)/);
          if (m && m[1] && m[2]) {
            lat = m[1];
            lng = m[2];
          }
        }

        let navUrl: string;
        if (lat && lng) {
          navUrl =
            Platform.OS === "ios"
              ? `maps:0,0?q=${lat},${lng}`
              : Platform.OS === "android"
              ? `geo:${lat},${lng}?q=${lat},${lng}`
              : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        } else if (link && /^https?:\/\//i.test(link)) {
          // Open web map link directly (e.g. https://maps.app.goo.gl/...)
          navUrl = link;
        } else {
          const query = encodeURIComponent(link || "");
          navUrl =
            Platform.OS === "ios"
              ? `maps:0,0?q=${query}`
              : Platform.OS === "android"
              ? `geo:0,0?q=${query}`
              : `https://www.google.com/maps/search/?api=1&query=${query}`;
        }
        Linking.openURL(navUrl).catch((err) => {
          console.error("Could not open navigation URL:", err);
        });
      },
    });
  };

  const handleVideoPlayingChange = useCallback((playing: boolean) => {
    setIsVideoPlaying(playing);
  }, []);

  const handleVideoTimelineDraggingChange = useCallback((dragging: boolean) => {
    try {
      scrollViewRef.current?.setNativeProps?.({ scrollEnabled: !dragging });
      fullscreenScrollRef.current?.setNativeProps?.({ scrollEnabled: !dragging });
    } catch {}
    setIsVideoTimelineDragging(dragging);
  }, []);

  const handleDownloadCurrentMedia = async () => {
    const idx = fullscreenMediaIndex !== null ? fullscreenMediaIndex : displayMediaIndex;
    const current = mediaItems[idx];
    if (!current?.url) return;
    try {
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = current.url;
        a.download = `media_${Date.now()}.${current.type === "video" ? "mp4" : "jpg"}`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const fileExt = current.type === "video" ? "mp4" : "jpg";
        const fileUri = `${FileSystem.cacheDirectory}media_${Date.now()}.${fileExt}`;
        const downloadRes = await FileSystem.downloadAsync(current.url, fileUri);
        if (downloadRes.uri) {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== "granted") {
            showConfirm({
              title: "Permission Required",
              message: "Please allow media library permissions to save photos to your gallery.",
              confirmText: "OK",
              destructive: false,
              onConfirm: () => {},
            });
            return;
          }
          await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
          showConfirm({
            title: "Saved",
            message: "Media saved to your photos/gallery.",
            confirmText: "OK",
            destructive: false,
            onConfirm: () => {},
          });
        }
      }
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listByStatus.invalidate();
      if (item?.id) {
        utils.content.getById.invalidate({ itemId: item.id });
        utils.content.getByIdWithMedia.invalidate({ itemId: item.id });
      }
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.subcategories.getContentCounts.invalidate();
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();
      onDeleted?.();
      onClose();
    },
  });

  const assignSound = trpc.sounds.assignToContent.useMutation({
    onSuccess: () => {
      if (item?.id) {
        utils.content.getById.invalidate({ itemId: item.id });
        utils.content.getByIdWithMedia.invalidate({ itemId: item.id });
      }
    },
  });

  const removeSound = trpc.sounds.removeFromContent.useMutation({
    onSuccess: () => {
      if (item?.id) {
        utils.content.getById.invalidate({ itemId: item.id });
        utils.content.getByIdWithMedia.invalidate({ itemId: item.id });
      }
    },
  });

  if (!displayItem) return null;

  const isQueued = displayItem.status === "queued";
  const isDone = displayItem.status === "done";

  const handleToggleQueue = () => {
    updateStatus.mutate({
      itemId: displayItem.id,
      status: isQueued ? "default" : "queued",
    });
  };

  const handleToggleDone = () => {
    updateStatus.mutate({
      itemId: displayItem.id,
      status: isDone ? "default" : "done",
    });
  };

  const handleDelete = () => {
    showConfirm({
      title: "Delete this item?",
      message: "This action cannot be undone. This will permanently delete the content.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => deleteItem.mutate({ itemId: displayItem.id }),
    });
  };

  const handleRemoveCategory = () => {
    showConfirm({
      title: "Remove from category?",
      message: "Are you sure you want to remove this item from this category? It will still be available in your other categories.",
      confirmText: "Remove",
      destructive: true,
      onConfirm: () => {
        if (onRemoveFromCategory) {
          onRemoveFromCategory();
        }
        onClose();
      },
    });
  };

  const handleRemoveSubcategory = () => {
    showConfirm({
      title: "Remove from subcategory?",
      message: "Are you sure you want to remove this item from this subcategory? It will still be available in your other categories.",
      confirmText: "Remove",
      destructive: true,
      onConfirm: () => {
        if (onRemoveFromSubcategory) {
          onRemoveFromSubcategory();
        }
        onClose();
      },
    });
  };

  const menuItems = [
    {
      label: isQueued ? "Unqueue" : "Queue",
      icon: Clock,
      onPress: handleToggleQueue,
    },
    {
      label: isDone ? "Undone" : "Done",
      icon: CheckCircle2,
      onPress: handleToggleDone,
    },
    {
      label: "Edit Details",
      icon: Pencil,
      onPress: () => setEditModalOpen(true),
    },
    ...(activeCategoryId || onRemoveFromCategory
      ? [
          {
            label: "Remove from Category",
            icon: FolderMinus,
            onPress: handleRemoveCategory,
          },
        ]
      : []),
    ...(activeSubcategoryId || onRemoveFromSubcategory
      ? [
          {
            label: "Remove from Subcategory",
            icon: FolderMinus,
            onPress: handleRemoveSubcategory,
          },
        ]
      : []),
    {
      label: "Delete Content",
      icon: Trash2,
      destructive: true,
      onPress: handleDelete,
    },
  ];

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme === "dark" ? "#0A0A0A" : "#F8FAFC",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
          {/* Top Bar matching web */}
          <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={styles.backBtn} hitSlop={8}>
              <ArrowLeft size={18} color={colors.text} />
              <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
            </Pressable>

            <View style={styles.centerStatus}>
              {isQueued && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: "rgba(59, 130, 246, 0.2)",
                      borderColor: "rgba(59, 130, 246, 0.3)",
                    },
                  ]}
                >
                  <Clock size={11} color="#3B82F6" />
                  <Text style={[styles.statusBadgeText, { color: "#3B82F6" }]}>Queued</Text>
                </View>
              )}
              {isDone && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      borderColor: "rgba(16, 185, 129, 0.3)",
                    },
                  ]}
                >
                  <CheckCircle2 size={11} color="#10B981" />
                  <Text style={[styles.statusBadgeText, { color: "#10B981" }]}>Done</Text>
                </View>
              )}
            </View>

            <DropdownMenu
              align="right"
              trigger={(open) => (
                <Pressable onPress={open} style={styles.menuCircleBtn} hitSlop={8}>
                  <MoreVertical size={18} color={colors.text} />
                </Pressable>
              )}
              items={menuItems}
            />
          </View>

          {/* Scrollable Viewer Body */}
          <ScrollView
            scrollEnabled={!isVideoTimelineDragging}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl {...refreshControlProps} />}
            scrollEventThrottle={50}
            onScroll={(e) => {
              setIsScrolledPastMedia(e.nativeEvent.contentOffset.y > 350);
            }}
          >
            <View
              style={styles.maxWidthWrapper}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - sliderWidth) > 2) {
                  setSliderWidth(w);
                }
              }}
            >
              {!freshItem ? (
                <View style={{ gap: 14, paddingTop: 4 }}>
                  <SkeletonShimmer style={{ height: 28, width: "70%" }} borderRadius={8} />
                  <SkeletonShimmer style={{ height: 34, width: "100%" }} borderRadius={10} />
                  <SkeletonShimmer style={{ height: Math.min(420, sliderHeight), width: "100%" }} borderRadius={14} />
                  <SkeletonShimmer style={{ height: 16, width: "90%" }} borderRadius={6} />
                  <SkeletonShimmer style={{ height: 16, width: "60%" }} borderRadius={6} />
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                    <SkeletonShimmer style={{ flex: 1, height: 46 }} borderRadius={12} />
                    <SkeletonShimmer style={{ flex: 1, height: 46 }} borderRadius={12} />
                  </View>
                </View>
              ) : (
                <>
              {/* Heading */}
              <Text style={[styles.heading, { color: colors.text }]}>
                {displayItem.heading}
              </Text>

              {/* 1. Header controls: Download Button | Sound Control Pill | Media Counter (1/2) */}
              {/* Only shown if there is media — sound is only allowed when media exists */}
              {mediaItems.length > 0 && (
              <View style={styles.topControlRow}>
                <Pressable
                  onPress={handleDownloadCurrentMedia}
                  style={[styles.downloadBtn, { backgroundColor: colors.glassBg, borderColor: colors.border }]}
                >
                  <Download size={13} color={colors.text} />
                  <Text style={[styles.downloadBtnText, { color: colors.text }]}>Download</Text>
                </Pressable>

                {/* Sound pill in middle */}
                <View style={styles.soundControlWrapper}>
                  {displaySound ? (
                    <SoundControl
                      sound={displaySound}
                      isParentVideoPlaying={
                        mediaItems[displayMediaIndex]?.type === "video"
                          ? (isVideoPlaying || isVideoBuffering || isVideoTimelineDragging)
                          : false
                      }
                      onSoundClick={() => setSoundPickerOpen(true)}
                    />
                  ) : (
                    <Pressable
                      onPress={() => setSoundPickerOpen(true)}
                      style={[styles.addSoundPill, { borderColor: colors.border }]}
                    >
                      <Music size={12} color={colors.textMuted} />
                      <Text style={[styles.addSoundText, { color: colors.textMuted }]}>
                        Add Sound
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Counter on right */}
                <Text style={[styles.mediaCounterText, { color: colors.textMuted }]}>
                  {displayMediaIndex + 1}/{mediaItems.length}
                </Text>
              </View>
              )}

              {/* 2. Media Section comes FIRST if media exists */}
              {mediaItems.length > 0 ? (
                <View style={styles.mediaSection}>
                  <View style={styles.mediaSliderContainer}>
                    {(() => {
                      const mediaScrollView = (
                    <ScrollView
                      ref={scrollViewRef}
                      horizontal
                      pagingEnabled={Platform.OS !== "web"}
                      snapToInterval={Platform.OS === "web" ? sliderWidth : undefined}
                      snapToAlignment={Platform.OS === "web" ? "center" : undefined}
                      disableIntervalMomentum={Platform.OS === "web"}
                      scrollEnabled={!isVideoTimelineDragging}
                      contentContainerStyle={{ alignItems: "center" }}
                      showsHorizontalScrollIndicator={false}
                      scrollEventThrottle={16}
                      onScroll={(e) => {
                        if (sliderWidth > 0) {
                          const page = Math.round(e.nativeEvent.contentOffset.x / sliderWidth);
                          if (page >= 0 && page < mediaItems.length && page !== activeMediaIndex) {
                            setActiveMediaIndex(page);
                          }
                        }
                      }}
                      onMomentumScrollEnd={(e) => {
                        if (sliderWidth > 0) {
                          const page = Math.round(e.nativeEvent.contentOffset.x / sliderWidth);
                          if (page >= 0 && page < mediaItems.length) {
                            setActiveMediaIndex(page);
                          }
                        }
                      }}
                      style={[
                        { width: sliderWidth, height: sliderHeight },
                        Platform.select({
                          web: {
                            scrollSnapType: "x mandatory",
                            overflowX: "auto",
                          } as any,
                        }),
                      ]}
                    >
                      {mediaItems.map((m, i) => {
                        const aspect = mediaAspectRatios[m.id];
                        const isLandscape = aspect ? aspect > (sliderWidth / sliderHeight) : false;
                        return (
                          <View
                            key={m.id}
                            style={[
                              styles.slideWrapper,
                              {
                                width: sliderWidth,
                                height: sliderHeight,
                              },
                              Platform.select({
                                web: {
                                  scrollSnapAlign: "center",
                                  scrollSnapStop: "always",
                                } as any,
                              }),
                            ]}
                          >
                            {m.type === "video" ? (
                              i === displayMediaIndex ? (
                                <CustomVideoPlayer
                                  uri={m.url}
                                  isActive={i === displayMediaIndex && !isScrolledPastMedia && visible && fullscreenMediaIndex === null}
                                  syncTime={videoSyncState?.url === m.url ? videoSyncState.time : undefined}
                                  syncIsPlaying={videoSyncState?.url === m.url ? videoSyncState.isPlaying : undefined}
                                  syncVersion={videoSyncState?.url === m.url ? videoSyncState.version : undefined}
                                  onTimeUpdate={(t) => {
                                    if (isFullscreenRef.current) return;
                                    const prev = videoPlaybackMapRef.current[m.url];
                                    videoPlaybackMapRef.current[m.url] = {
                                      time: t,
                                      isPlaying: prev?.isPlaying ?? false,
                                    };
                                  }}
                                  onPlayingChange={(playing) => {
                                    if (!isFullscreenRef.current && i === displayMediaIndex) {
                                      const prev = videoPlaybackMapRef.current[m.url];
                                      videoPlaybackMapRef.current[m.url] = {
                                        time: prev?.time ?? 0,
                                        isPlaying: playing,
                                      };
                                    }
                                    handleVideoPlayingChange(playing);
                                  }}
                                  onBufferingChange={setIsVideoBuffering}
                                  onUserPausedChange={setIsVideoUserPaused}
                                  onDraggingChange={handleVideoTimelineDraggingChange}
                                  onFullscreenTrigger={() => openFullscreen(i)}
                                />
                              ) : (
                                <View style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />
                              )
                            ) : Math.abs(i - displayMediaIndex) <= 1 ? (
                              <Pressable
                                onPress={() => openFullscreen(i)}
                                style={[
                                  styles.imageFramelessWrapper,
                                  aspect
                                    ? isLandscape
                                      ? { width: "100%", aspectRatio: aspect }
                                      : { height: "100%", aspectRatio: aspect }
                                    : { width: "100%", height: "100%" },
                                ]}
                              >
                                <ModalMediaImage
                                  uri={m.url}
                                  onAspectRatio={(ratio) => {
                                    setMediaAspectRatios((prev) => ({
                                      ...prev,
                                      [m.id]: ratio,
                                    }));
                                  }}
                                />
                              </Pressable>
                            ) : (
                              <View style={{ width: "100%", height: "100%" }} />
                            )}
                          </View>
                        );
                      })}
                    </ScrollView>
                      );
                      return Platform.OS !== "web" ? (
                        <GestureDetector gesture={inlinePinchGesture}>{mediaScrollView}</GestureDetector>
                      ) : (
                        <>
                          {mediaScrollView}
                          {mediaItems.length > 1 && displayMediaIndex > 0 && (
                            <Pressable
                              onPress={() => {
                                const prevIdx = displayMediaIndex - 1;
                                scrollViewRef.current?.scrollTo({ x: prevIdx * sliderWidth, animated: true });
                                setActiveMediaIndex(prevIdx);
                              }}
                              style={{
                                position: "absolute",
                                left: 8,
                                top: "50%",
                                marginTop: -18,
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: "rgba(0,0,0,0.55)",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 20,
                              }}
                            >
                              <ChevronLeft size={20} color="#FFFFFF" />
                            </Pressable>
                          )}
                          {mediaItems.length > 1 && displayMediaIndex < mediaItems.length - 1 && (
                            <Pressable
                              onPress={() => {
                                const nextIdx = displayMediaIndex + 1;
                                scrollViewRef.current?.scrollTo({ x: nextIdx * sliderWidth, animated: true });
                                setActiveMediaIndex(nextIdx);
                              }}
                              style={{
                                position: "absolute",
                                right: 8,
                                top: "50%",
                                marginTop: -18,
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: "rgba(0,0,0,0.55)",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 20,
                              }}
                            >
                              <ChevronRight size={20} color="#FFFFFF" />
                            </Pressable>
                          )}
                        </>
                      );
                    })()}

                    {/* Pagination indicator dots and location button row */}
                    <View style={styles.paginationRow}>
                      {hasLocation ? (
                        <Pressable
                          onPress={handleLocationPress}
                          hitSlop={8}
                          style={styles.locationDotBtn}
                        >
                          <MapPin size={17} color={colors.text} />
                        </Pressable>
                      ) : (
                        <View style={styles.locationDotPlaceholder} />
                      )}

                      <View style={styles.dotsCenter}>
                        {mediaItems.length > 1 &&
                          mediaItems.map((_, i) => (
                            <Pressable
                              key={`dot-${i}`}
                              onPress={() => {
                                scrollViewRef.current?.scrollTo({ x: i * sliderWidth, animated: true });
                                setActiveMediaIndex(i);
                              }}
                              hitSlop={8}
                              style={[
                                styles.dot,
                                {
                                  backgroundColor:
                                    i === displayMediaIndex ? colors.text : colors.textSubtle,
                                  opacity: i === displayMediaIndex ? 1 : 0.4,
                                  transform: [{ scale: i === displayMediaIndex ? 1.3 : 1 }],
                                },
                              ]}
                            />
                          ))}
                      </View>

                      <View style={styles.locationDotPlaceholder} />
                    </View>
                  </View>
                </View>
              ) : null}

              {/* If NO media: Cover Poster Image comes FIRST (in place of media section) */}
              {mediaItems.length === 0 && displayItem.posterImageUrl ? (
                <View style={styles.posterContainer}>
                  <View style={[styles.posterImageWrapper, coverAspectRatio ? { aspectRatio: coverAspectRatio } : { minHeight: 200 }]}>
                    <Image
                      source={{ uri: displayItem.posterImageUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      priority="high"
                      onLoad={(e) => {
                        if (e.source.width && e.source.height) {
                          setCoverAspectRatio(e.source.width / e.source.height);
                        }
                      }}
                    />
                  </View>
                </View>
              ) : null}

              {/* 3. Created Date */}
              {(displayItem as any).createdAt && (
                <View style={styles.dateRow}>
                  <Calendar size={13} color={colors.textSubtle} />
                  <Text style={[styles.dateText, { color: colors.textSubtle }]}>
                    {format(new Date((displayItem as any).createdAt), "PPP")}
                  </Text>
                </View>
              )}

              {/* 4. Description */}
              {displayItem.description ? (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {displayItem.description}
                </Text>
              ) : null}

              {/* 5. Cover Poster Image when media DOES exist (comes after description) */}
              {mediaItems.length > 0 && displayItem.posterImageUrl ? (
                <View style={styles.posterContainer}>
                  <View style={[styles.posterImageWrapper, coverAspectRatio ? { aspectRatio: coverAspectRatio } : { minHeight: 200 }]}>
                    <Image
                      source={{ uri: displayItem.posterImageUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      priority="high"
                      onLoad={(e) => {
                        if (e.source.width && e.source.height) {
                          setCoverAspectRatio(e.source.width / e.source.height);
                        }
                      }}
                    />
                  </View>
                </View>
              ) : null}

              {/* If no media was found, show the empty box at the bottom */}
              {mediaItems.length === 0 && !!freshItem && (
                <View style={[styles.mediaEmptyBox, { borderColor: colors.border, marginBottom: 20 }]}>
                  <Images size={24} color={colors.textSubtle} />
                  <Text style={[styles.mediaEmptyText, { color: colors.textSubtle }]}>
                    No media here
                  </Text>
                </View>
              )}

              {/* Status Action Buttons */}
              <View style={styles.bottomActionsRow}>
                <Pressable
                  onPress={handleToggleQueue}
                  style={[
                    styles.statusActionButton,
                    isQueued
                      ? {
                          backgroundColor: "rgba(59, 130, 246, 0.2)",
                          borderColor: "#3B82F6",
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <Clock size={16} color={isQueued ? "#3B82F6" : colors.textMuted} />
                  <Text
                    style={[
                      styles.statusActionText,
                      { color: isQueued ? "#3B82F6" : colors.text },
                    ]}
                  >
                    {isQueued ? "Queued" : "Queue"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleToggleDone}
                  style={[
                    styles.statusActionButton,
                    isDone
                      ? {
                          backgroundColor: "rgba(16, 185, 129, 0.2)",
                          borderColor: "#10B981",
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <CheckCircle2
                    size={16}
                    color={isDone ? "#10B981" : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.statusActionText,
                      { color: isDone ? "#10B981" : colors.text },
                    ]}
                  >
                    {isDone ? "Completed" : "Done"}
                  </Text>
                </Pressable>
              </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>

      {/* Edit Content Modal */}
      <EditContentModal
        item={displayItem as any}
        visible={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => {
          if (item?.id) {
            utils.content.getById.invalidate({ itemId: item.id });
            utils.content.getByIdWithMedia.invalidate({ itemId: item.id });
          }
        }}
      />
      <AppDialogRenderer {...dialogState} onHide={hide} />
      <SoundPickerModal
        visible={soundPickerOpen}
        currentSoundId={activeSound?.id}
        contentId={item?.id}
        onClose={() => setSoundPickerOpen(false)}
        onSelect={(sound) => {
          setActiveSound(sound);
          setSoundPickerOpen(false);
          if (!item?.id) return;
          if (sound) {
            assignSound.mutate({ contentId: item.id, soundId: sound.id });
          } else {
            removeSound.mutate({ contentId: item.id });
          }
        }}
      />

      {/* ── Fullscreen Media Viewer (in-tree overlay for 0ms open lag) ── */}
      {fullscreenMediaIndex !== null && mediaItems.length > 0 && (() => {
        const fsOverlay = (
          <View
            style={[
              styles.fullscreenMediaBackdrop,
              StyleSheet.absoluteFill,
              {
                zIndex: 999,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                paddingLeft: insets.left,
                paddingRight: insets.right,
              },
            ]}
          >
            {/* Top Bar with Back Button, Counter, and Download — instant opacity toggle */}
            <Animated.View
              pointerEvents={fsHeaderPointerEvents}
              style={[
                styles.fullscreenMediaHeader,
                {
                  paddingTop: Math.max(insets.top, 16) + 8,
                  opacity: fsHeaderOpacity,
                },
              ]}
            >
              <Pressable
                onPress={closeFullscreen}
                hitSlop={12}
                style={styles.fullscreenBackBtn}
              >
                <ArrowLeft size={20} color="#FFFFFF" />
                <Text style={styles.fullscreenBackBtnText}>Back</Text>
              </Pressable>

              {mediaItems.length > 1 && (
                <View style={styles.fullscreenCounterPill}>
                  <Text style={styles.fullscreenCounterText}>
                    {fullscreenMediaIndex + 1} / {mediaItems.length}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleDownloadCurrentMedia}
                hitSlop={12}
                style={styles.fullscreenActionBtn}
              >
                <Download size={18} color="#FFFFFF" />
              </Pressable>
            </Animated.View>

            {/* Slidable Media Container */}
            <View
              style={styles.fullscreenMediaBody}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - fullscreenWidth) > 2) {
                  setFullscreenWidth(w);
                }
                if (fullscreenMediaIndex !== null && w > 0) {
                  fullscreenScrollRef.current?.scrollTo({
                    x: fullscreenMediaIndex * w,
                    animated: false,
                  });
                }
              }}
            >
              <ScrollView
                ref={fullscreenScrollRef}
                horizontal
                pagingEnabled={Platform.OS !== "web"}
                snapToInterval={Platform.OS === "web" ? fullscreenWidth : undefined}
                snapToAlignment={Platform.OS === "web" ? "center" : undefined}
                disableIntervalMomentum={Platform.OS === "web"}
                scrollEnabled={!isVideoTimelineDragging}
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: fullscreenMediaIndex * fullscreenWidth, y: 0 }}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  if (fullscreenWidth > 0) {
                    const page = Math.round(e.nativeEvent.contentOffset.x / fullscreenWidth);
                    if (page >= 0 && page < mediaItems.length && page !== fullscreenMediaIndex) {
                      setFullscreenMediaIndex(page);
                      setActiveMediaIndex(page);
                      scrollViewRef.current?.scrollTo({ x: page * sliderWidth, animated: false });
                    }
                  }
                }}
                onMomentumScrollEnd={(e) => {
                  if (fullscreenWidth > 0) {
                    const page = Math.round(e.nativeEvent.contentOffset.x / fullscreenWidth);
                    if (page >= 0 && page < mediaItems.length) {
                      setFullscreenMediaIndex(page);
                      setActiveMediaIndex(page);
                      scrollViewRef.current?.scrollTo({ x: page * sliderWidth, animated: false });
                    }
                  }
                }}
                style={[
                  { width: fullscreenWidth, height: "100%" },
                  Platform.select({
                    web: {
                      scrollSnapType: "x mandatory",
                      overflowX: "auto",
                    } as any,
                  }),
                ]}
              >
                {mediaItems.map((m, i) => (
                  <View
                    key={`fs-${m.id}`}
                    style={[
                      {
                        width: fullscreenWidth,
                        height: "100%",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                      Platform.select({
                        web: {
                          scrollSnapAlign: "center",
                          scrollSnapStop: "always",
                        } as any,
                      }),
                    ]}
                  >
                    {m.type === "video" ? (
                      i === fullscreenMediaIndex ? (
                        <View style={{ width: "100%", height: "100%" }}>
                          <CustomVideoPlayer
                            uri={m.url}
                            isActive={i === fullscreenMediaIndex}
                            syncTime={videoSyncState?.url === m.url ? videoSyncState.time : undefined}
                            syncIsPlaying={videoSyncState?.url === m.url ? videoSyncState.isPlaying : undefined}
                            syncVersion={videoSyncState?.url === m.url ? videoSyncState.version : undefined}
                            onTimeUpdate={(t) => {
                              if (!isFullscreenRef.current) return;
                              const prev = videoPlaybackMapRef.current[m.url];
                              videoPlaybackMapRef.current[m.url] = {
                                time: t,
                                isPlaying: prev?.isPlaying ?? false,
                              };
                            }}
                            onPlayingChange={(playing) => {
                              if (isFullscreenRef.current && i === fullscreenMediaIndex) {
                                const prev = videoPlaybackMapRef.current[m.url];
                                videoPlaybackMapRef.current[m.url] = {
                                  time: prev?.time ?? 0,
                                  isPlaying: playing,
                                };
                              }
                              handleVideoPlayingChange(playing);
                            }}
                            onBufferingChange={setIsVideoBuffering}
                            onUserPausedChange={setIsVideoUserPaused}
                            onDraggingChange={handleVideoTimelineDraggingChange}
                            onFullscreenExit={closeFullscreen}
                          />
                          <Pressable
                            onPress={toggleFullscreenControls}
                            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 54 }}
                          />
                        </View>
                      ) : null
                    ) : Math.abs(i - fullscreenMediaIndex) <= 1 ? (
                      <Pressable
                        onPress={toggleFullscreenControls}
                        style={{ width: "100%", height: "100%" }}
                      >
                        <Image
                          source={{ uri: m.url }}
                          style={styles.fullscreenImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          priority="high"
                        />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        );

        return Platform.OS !== "web" ? (
          <GestureDetector gesture={fullscreenPinchGesture}>{fsOverlay}</GestureDetector>
        ) : (
          fsOverlay
        );
      })()}
    </>
  );
}

export function ContentDetailModal(props: ContentDetailModalProps) {
  if (!props.visible || !props.item) return null;
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent={false}
      onRequestClose={props.onClose}
    >
      <ContentDetailView {...props} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
  },
  centerStatus: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  menuCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 672,
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  posterContainer: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "transparent",
    marginBottom: 24,
    alignItems: "center",
  },
  posterImageWrapper: {
    width: "100%",
    backgroundColor: "transparent",
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
  },
  mediaSection: {
    marginBottom: 28,
  },
  mediaSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  mediaSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mediaBoxPlaceholder: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaSliderContainer: {
    alignItems: "center",
    backgroundColor: "transparent",
  },
  slideWrapper: {
    backgroundColor: "transparent",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  imageFramelessWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    maxHeight: "100%",
    maxWidth: "100%",
  },
  imageFrameless: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  slideVideoOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  slideVideoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    width: "100%",
    paddingHorizontal: 4,
  },
  dotsCenter: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  locationDotBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  locationDotPlaceholder: {
    width: 32,
    height: 32,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mediaEmptyBox: {
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mediaEmptyText: {
    fontSize: 13,
  },
  bottomActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statusActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  soundRow: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  topControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 16,
    gap: 8,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  soundControlWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCounterText: {
    fontSize: 12,
    fontWeight: "700",
    width: 32,
    textAlign: "right",
  },
  addSoundPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  addSoundText: {
    fontSize: 12,
    fontWeight: "500",
  },
  fullscreenMediaBackdrop: {
    backgroundColor: "#000000",
  },
  fullscreenMediaHeader: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 100,
  },
  fullscreenBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(30, 30, 30, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...Platform.select({
      web: { backdropFilter: "blur(12px)", cursor: "pointer" } as any,
      default: {},
    }),
  },
  fullscreenBackBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  fullscreenCounterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(30, 30, 30, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  fullscreenCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  fullscreenActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 30, 30, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  fullscreenMediaBody: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
});
