import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Link, X, Camera, Crop } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";
import { CroppedImage } from "./CroppedImage";
import { ImageCropperModal, type CropData } from "./ImageCropperModal";

export interface ImageValue {
  uri: string;
  isUrl: boolean;
  asset: ImagePicker.ImagePickerAsset | null;
  cropData?: CropData | null;
}

interface ImagePickerToggleProps {
  label?: string;
  currentImageUrl?: string | null;
  currentCropData?: string | null;
  onImageSelected: (value: ImageValue | null) => void;
  naturalRatio?: boolean;
  frameHeight?: number;
}

export function ImagePickerToggle({
  label = "Cover Image",
  currentImageUrl,
  currentCropData,
  onImageSelected,
  naturalRatio = true,
  frameHeight = 160,
}: ImagePickerToggleProps) {
  const { colors, theme } = useTheme();

  const [tab, setTab] = useState<"file" | "camera" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [previewUri, setPreviewUri] = useState<string | null>(currentImageUrl ?? null);
  const [currentAsset, setCurrentAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cropData, setCropData] = useState<CropData | null>(() => {
    if (currentCropData) {
      try {
        return JSON.parse(currentCropData);
      } catch {}
    }
    return null;
  });
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  const [cropperVisible, setCropperVisible] = useState(false);
  const [cropSrc, setCropSrc] = useState("");

  useEffect(() => {
    setPreviewUri(currentImageUrl ?? null);
    if (currentImageUrl && currentImageUrl.startsWith("http")) {
      setUrlInput(currentImageUrl);
    } else if (!currentImageUrl) {
      setUrlInput("");
      setCurrentAsset(null);
    }
  }, [currentImageUrl]);

  useEffect(() => {
    if (currentCropData) {
      try {
        const parsed = JSON.parse(currentCropData);
        setCropData(parsed);
      } catch {}
    } else {
      setCropData(null);
    }
  }, [currentCropData]);

  const handlePickFile = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0];
        if (asset.width && asset.height) {
          setAspectRatio(asset.width / asset.height);
        }
        setPreviewUri(asset.uri);
        setCurrentAsset(asset);
        setCropData(null);
        onImageSelected({
          uri: asset.uri,
          isUrl: false,
          asset,
          cropData: null,
        });
      }
    } catch (err) {
      console.error("Failed to pick image:", err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0];
        if (asset.width && asset.height) {
          setAspectRatio(asset.width / asset.height);
        }
        setPreviewUri(asset.uri);
        setCurrentAsset(asset);
        setCropData(null);
        onImageSelected({
          uri: asset.uri,
          isUrl: false,
          asset,
          cropData: null,
        });
      }
    } catch (err) {
      console.error("Failed to take photo:", err);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) {
      return;
    }
    setPreviewUri(trimmed);
    setCurrentAsset(null);
    setCropData(null);
    onImageSelected({
      uri: trimmed,
      isUrl: true,
      asset: null,
      cropData: null,
    });
  };

  const handleClear = () => {
    setPreviewUri(null);
    setCurrentAsset(null);
    setCropData(null);
    setAspectRatio(undefined);
    setUrlInput("");
    onImageSelected(null);
  };

  const openCropperFor = (uri: string) => {
    setCropSrc(uri);
    setCropperVisible(true);
  };

  const serializedCrop = cropData ? JSON.stringify(cropData) : null;

  return (
    <View style={styles.container}>
      {/* Single Current Cover Preview (with Crop + Clear buttons + Replace below banner) */}
      {previewUri ? (
        <View style={styles.sectionBlock}>
          <View
            style={[
              styles.imageCard,
              naturalRatio
                ? aspectRatio
                  ? { aspectRatio }
                  : { height: frameHeight }
                : { height: frameHeight },
            ]}
          >
            <CroppedImage
              src={previewUri}
              cropData={serializedCrop}
              onAspectRatioDetected={(r) => {
                if (naturalRatio) {
                  setAspectRatio(r);
                }
              }}
            />
            <View style={styles.topRightActions}>
              <Pressable
                onPress={() => openCropperFor(previewUri)}
                style={styles.actionCircleBtn}
                hitSlop={8}
              >
                <Crop size={14} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleClear}
                style={styles.actionCircleBtn}
                hitSlop={8}
              >
                <X size={14} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.replaceBanner}>
              <Text style={styles.replaceBannerText}>Replace below ↓</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Switcher */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor:
              theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => setTab("file")}
          style={[
            styles.tabItem,
            tab === "file" && {
              backgroundColor:
                theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "#0F172A",
            },
          ]}
        >
          <ImagePlus
            size={14}
            color={tab === "file" ? "#FFFFFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: tab === "file" ? "#FFFFFF" : colors.textMuted },
            ]}
          >
            {previewUri ? "Replace with file" : "Upload"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("camera")}
          style={[
            styles.tabItem,
            tab === "camera" && {
              backgroundColor:
                theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "#0F172A",
            },
          ]}
        >
          <Camera
            size={14}
            color={tab === "camera" ? "#FFFFFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: tab === "camera" ? "#FFFFFF" : colors.textMuted },
            ]}
          >
            Camera
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("url")}
          style={[
            styles.tabItem,
            tab === "url" && {
              backgroundColor:
                theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "#0F172A",
            },
          ]}
        >
          <Link
            size={14}
            color={tab === "url" ? "#FFFFFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: tab === "url" ? "#FFFFFF" : colors.textMuted },
            ]}
          >
            {previewUri ? "Replace with URL" : "URL"}
          </Text>
        </Pressable>
      </View>

      {/* Input controls */}
      {tab === "file" ? (
        <Pressable
          onPress={handlePickFile}
          style={[
            styles.dropzone,
            {
              borderColor: colors.border,
              backgroundColor:
                theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            },
          ]}
        >
          <ImagePlus size={24} color={colors.textSubtle} />
          <Text style={[styles.dropzoneText, { color: colors.textMuted }]}>
            {label}
          </Text>
        </Pressable>
      ) : tab === "camera" ? (
        <Pressable
          onPress={handleTakePhoto}
          style={[
            styles.dropzone,
            {
              borderColor: colors.border,
              backgroundColor:
                theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            },
          ]}
        >
          <Camera size={24} color="#3B82F6" />
          <Text style={[styles.dropzoneText, { color: colors.textMuted }]}>
            Take Photo with Camera
          </Text>
        </Pressable>
      ) : (
        <View style={styles.urlInputBlock}>
          <TextInput
            style={[
              styles.urlInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor:
                  theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
              },
            ]}
            placeholder="https://i.pinimg.com/... or image URL"
            placeholderTextColor={colors.textSubtle}
            value={urlInput}
            onChangeText={(txt) => {
              setUrlInput(txt);
              const trimmed = txt.trim();
              if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                setPreviewUri(trimmed);
                setCurrentAsset(null);
                onImageSelected({
                  uri: trimmed,
                  isUrl: true,
                  asset: null,
                  cropData,
                });
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.urlBtnRow}>
            <Pressable
              onPress={handleApplyUrl}
              disabled={urlInput.trim().length <= 7}
              style={[
                styles.urlActionBtn,
                {
                  backgroundColor: theme === "dark" ? "rgba(255,255,255,0.2)" : "#111827",
                  opacity: urlInput.trim().length > 7 ? 1 : 0.5,
                },
              ]}
            >
              <Text style={styles.urlActionBtnText}>Add</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const trimmed = urlInput.trim();
                if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                  openCropperFor(trimmed);
                }
              }}
              disabled={urlInput.trim().length <= 7}
              style={[
                styles.urlActionBtn,
                {
                  backgroundColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: urlInput.trim().length > 7 ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[styles.urlActionBtnText, { color: colors.text }]}>Crop</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Crop Modal */}
      <ImageCropperModal
        visible={cropperVisible}
        src={cropSrc}
        frameHeight={frameHeight}
        naturalRatio={naturalRatio}
        initialCropData={cropData}
        onConfirm={(nextCrop) => {
          setCropData(nextCrop);
          const activeUri = cropSrc || previewUri;
          if (activeUri) {
            setPreviewUri(activeUri);
            onImageSelected({
              uri: activeUri,
              isUrl: !currentAsset,
              asset: currentAsset,
              cropData: nextCrop,
            });
          }
          setCropperVisible(false);
        }}
        onCancel={() => setCropperVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: "100%",
  },
  sectionBlock: {
    width: "100%",
  },
  imageCard: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  topRightActions: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
    zIndex: 10,
  },
  actionCircleBtn: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  replaceBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  replaceBannerText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 11,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dropzone: {
    height: 90,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dropzoneText: {
    fontSize: 13,
    fontWeight: "500",
  },
  urlInputBlock: {
    gap: 8,
  },
  urlInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  urlBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  urlActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  urlActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
