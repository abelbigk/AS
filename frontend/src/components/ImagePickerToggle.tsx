import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Link, Trash2, Check, Camera } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

export interface ImageValue {
  uri: string;
  isUrl: boolean;
  asset: ImagePicker.ImagePickerAsset | null;
}

interface ImagePickerToggleProps {
  label?: string;
  currentImageUrl?: string | null;
  onImageSelected: (value: ImageValue | null) => void;
  naturalRatio?: boolean;
}

export function ImagePickerToggle({
  label = "Cover Image",
  currentImageUrl,
  onImageSelected,
  naturalRatio = true,
}: ImagePickerToggleProps) {
  const { colors, theme } = useTheme();

  const [tab, setTab] = useState<"file" | "camera" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  // Old/existing cover (displayed at top)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(currentImageUrl ?? null);
  // Newly chosen replacement cover (displayed below)
  const [newCover, setNewCover] = useState<ImageValue | null>(null);

  // Aspect ratios for natural display
  const [existingAspectRatio, setExistingAspectRatio] = useState<number | undefined>(undefined);
  const [newAspectRatio, setNewAspectRatio] = useState<number | undefined>(undefined);

  useEffect(() => {
    setExistingCoverUrl(currentImageUrl ?? null);
  }, [currentImageUrl]);

  const handlePickFile = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // keep original size and aspect ratio
        quality: 1,
      });

      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0];
        if (asset.width && asset.height) {
          setNewAspectRatio(asset.width / asset.height);
        }
        const val: ImageValue = {
          uri: asset.uri,
          isUrl: false,
          asset,
        };
        setNewCover(val);
        onImageSelected(val);
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
          setNewAspectRatio(asset.width / asset.height);
        }
        const val: ImageValue = {
          uri: asset.uri,
          isUrl: false,
          asset,
        };
        setNewCover(val);
        onImageSelected(val);
      }
    } catch (err) {
      console.error("Failed to take photo:", err);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return;
    }
    const val: ImageValue = {
      uri: trimmed,
      isUrl: true,
      asset: null,
    };
    setNewCover(val);
    onImageSelected(val);
  };

  const handleClearExisting = () => {
    setExistingCoverUrl(null);
    if (!newCover) {
      onImageSelected(null);
    }
  };

  const handleClearNew = () => {
    setNewCover(null);
    setUrlInput("");
    if (existingCoverUrl) {
      onImageSelected({
        uri: existingCoverUrl,
        isUrl: true,
        asset: null,
      });
    } else {
      onImageSelected(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Existing Old Cover Image at original size */}
      {existingCoverUrl ? (
        <View style={styles.sectionBlock}>
          <View style={[styles.imageCard, existingAspectRatio ? { aspectRatio: existingAspectRatio } : styles.fallbackHeight]}>
            <Image
              source={{ uri: existingCoverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              onLoad={(e) => {
                if (e.source.width && e.source.height) {
                  setExistingAspectRatio(e.source.width / e.source.height);
                }
              }}
            />
            <Pressable onPress={handleClearExisting} style={styles.removeBtn} hitSlop={8}>
              <Trash2 size={14} color="#FFFFFF" />
            </Pressable>
            <View style={styles.replaceBanner}>
              <Text style={styles.replaceBannerText}>Replace below ↓</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* 2. Switcher for Replace with File or Replace with URL */}
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
            tab === "file" && [
              styles.tabItemActive,
              {
                backgroundColor:
                  theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "#0F172A",
              },
            ],
          ]}
        >
          <ImagePlus
            size={14}
            color={tab === "file" ? "#FFFFFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: tab === "file" ? "#FFFFFF" : colors.textMuted,
              },
            ]}
          >
            {existingCoverUrl ? "File" : "Upload"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("camera")}
          style={[
            styles.tabItem,
            tab === "camera" && [
              styles.tabItemActive,
              {
                backgroundColor:
                  theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "#0F172A",
              },
            ],
          ]}
        >
          <Camera
            size={14}
            color={tab === "camera" ? "#FFFFFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: tab === "camera" ? "#FFFFFF" : colors.textMuted,
              },
            ]}
          >
            Camera
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("url")}
          style={[
            styles.tabItem,
            tab === "url" && [
              styles.tabItemActive,
              {
                backgroundColor:
                  theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "#0F172A",
              },
            ],
          ]}
        >
          <Link
            size={14}
            color={tab === "url" ? "#FFFFFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: tab === "url" ? "#FFFFFF" : colors.textMuted,
              },
            ]}
          >
            {existingCoverUrl ? "URL" : "URL"}
          </Text>
        </Pressable>
      </View>

      {/* 3. Input controls for file / camera / url */}
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
            {existingCoverUrl ? "Choose replacement image file" : label}
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
          <View style={styles.urlInputRow}>
            <TextInput
              style={[
                styles.urlInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor:
                    theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                },
              ]}
              placeholder="https://i.pinimg.com/... or image URL"
              placeholderTextColor={colors.textSubtle}
              value={urlInput}
              onChangeText={(txt) => {
                setUrlInput(txt);
                if (txt.trim().startsWith("http://") || txt.trim().startsWith("https://")) {
                  const val: ImageValue = {
                    uri: txt.trim(),
                    isUrl: true,
                    asset: null,
                  };
                  setNewCover(val);
                  onImageSelected(val);
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={handleApplyUrl}
              style={[
                styles.urlApplyBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: urlInput.trim().length > 7 ? 1 : 0.5,
                },
              ]}
              disabled={urlInput.trim().length <= 7}
            >
              <Check size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* 4. Replacement New Cover Image Viewer (below) at original size */}
      {newCover ? (
        <View style={styles.sectionBlock}>
          <View style={[styles.imageCard, newAspectRatio ? { aspectRatio: newAspectRatio } : styles.fallbackHeight]}>
            <Image
              source={{ uri: newCover.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              onLoad={(e) => {
                if (e.source.width && e.source.height) {
                  setNewAspectRatio(e.source.width / e.source.height);
                }
              }}
            />
            <Pressable onPress={handleClearNew} style={styles.removeBtn} hitSlop={8}>
              <Trash2 size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}
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
  fallbackHeight: {
    height: 200,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  replaceBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  replaceBannerText: {
    color: "rgba(255, 255, 255, 0.85)",
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
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabItemActive: {},
  tabText: {
    fontSize: 12,
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
  urlInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  urlInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  urlApplyBtn: {
    height: 42,
    width: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
