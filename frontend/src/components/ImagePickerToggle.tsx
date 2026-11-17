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
import { ImagePlus, Link, Trash2, Check } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

export interface ImageValue {
  uri: string;
  isUrl: boolean;
  asset?: ImagePicker.ImagePickerAsset | null;
}

interface ImagePickerToggleProps {
  label?: string;
  currentImageUrl?: string | null;
  onImageSelected: (value: ImageValue | null) => void;
  aspectRatio?: number;
}

export function ImagePickerToggle({
  label = "Cover Image",
  currentImageUrl,
  onImageSelected,
  aspectRatio = 16 / 9,
}: ImagePickerToggleProps) {
  const { colors, theme } = useTheme();
  const [tab, setTab] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [previewUri, setPreviewUri] = useState<string | null>(currentImageUrl || null);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);

  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUri(currentImageUrl);
      if (currentImageUrl.startsWith("http")) {
        setUrlInput(currentImageUrl);
      }
    }
  }, [currentImageUrl]);

  const handlePickFile = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0];
        setPreviewUri(asset.uri);
        onImageSelected({
          uri: asset.uri,
          isUrl: false,
          asset,
        });
      }
    } catch (err) {
      console.error("Failed to pick image:", err);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return;
    }
    setPreviewUri(trimmed);
    onImageSelected({
      uri: trimmed,
      isUrl: true,
      asset: null,
    });
  };

  const handleClear = () => {
    setPreviewUri(null);
    setUrlInput("");
    onImageSelected(null);
  };

  return (
    <View style={styles.container}>
      {/* Existing or New Preview */}
      {previewUri ? (
        <View style={[styles.previewContainer, { aspectRatio }]}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="cover" />
          <Pressable onPress={handleClear} style={styles.removeBtn} hitSlop={8}>
            <Trash2 size={14} color="#FFFFFF" />
          </Pressable>
          <View style={styles.replaceBanner}>
            <Text style={styles.replaceBannerText}>Replace below ↓</Text>
          </View>
        </View>
      ) : null}

      {/* Segmented Switcher */}
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
            color={
              tab === "file"
                ? "#FFFFFF"
                : colors.textMuted
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  tab === "file"
                    ? "#FFFFFF"
                    : colors.textMuted,
              },
            ]}
          >
            {previewUri ? "Replace with file" : "Upload"}
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
            color={
              tab === "url"
                ? "#FFFFFF"
                : colors.textMuted
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  tab === "url"
                    ? "#FFFFFF"
                    : colors.textMuted,
              },
            ]}
          >
            {previewUri ? "Replace with URL" : "URL"}
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
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
            {previewUri ? "Choose a different image file" : label}
          </Text>
        </Pressable>
      ) : (
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
            placeholder="https://..."
            placeholderTextColor={colors.textSubtle}
            value={urlInput}
            onChangeText={(txt) => {
              setUrlInput(txt);
              if (txt.trim().startsWith("http://") || txt.trim().startsWith("https://")) {
                setPreviewUri(txt.trim());
                onImageSelected({
                  uri: txt.trim(),
                  isUrl: true,
                  asset: null,
                });
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  previewContainer: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  replaceBannerText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 11,
    fontWeight: "500",
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
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  tabItemActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dropzone: {
    height: 74,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dropzoneText: {
    fontSize: 12,
    fontWeight: "500",
  },
  urlInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  urlApplyBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
