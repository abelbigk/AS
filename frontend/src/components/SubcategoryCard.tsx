import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CroppedImage } from "./CroppedImage";
import { useTheme } from "../contexts/ThemeContext";

interface SubcategoryCardProps {
  subcategory: {
    id: number;
    name: string;
    description?: string | null;
    coverImageUrl?: string | null;
    coverCropData?: string | null;
  };
  count?: number;
  onPress: () => void;
}

export function SubcategoryCard({
  subcategory,
  count = 0,
  onPress,
}: SubcategoryCardProps) {
  const { colors, theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor:
            theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.75)",
          borderColor:
            theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {subcategory.coverImageUrl ? (
        <View style={styles.imageWrapper}>
          <CroppedImage
            src={subcategory.coverImageUrl}
            cropData={subcategory.coverCropData}
          />
          <LinearGradient
            colors={["transparent", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.88)"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top-right count badge */}
          <View style={styles.badgeWrapper}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          </View>

          {/* Bottom text overlay */}
          <View style={styles.bottomInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {subcategory.name}
            </Text>
            {subcategory.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {subcategory.description}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.noImageContent}>
          {/* Top-right count badge */}
          <View style={styles.badgeWrapper}>
            <View style={[styles.countBadge, { backgroundColor: colors.surfaceHover }]}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>{count}</Text>
            </View>
          </View>

          <View style={styles.bottomInfoNoImage}>
            <Text style={[styles.nameNoImage, { color: colors.text }]} numberOfLines={1}>
              {subcategory.name}
            </Text>
            {subcategory.description ? (
              <Text style={[styles.descNoImage, { color: colors.textMuted }]} numberOfLines={2}>
                {subcategory.description}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    ...Platform.select({
      web: {
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
        cursor: "pointer",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  imageWrapper: {
    width: "100%",
    height: 120,
    position: "relative",
  },
  badgeWrapper: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 8,
    left: 10,
    right: 10,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  desc: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 11,
    marginTop: 2,
  },
  noImageContent: {
    padding: 12,
    minHeight: 90,
    justifyContent: "flex-end",
    position: "relative",
  },
  bottomInfoNoImage: {
    marginTop: 18,
  },
  nameNoImage: {
    fontSize: 13,
    fontWeight: "700",
  },
  descNoImage: {
    fontSize: 11,
    marginTop: 2,
  },
});
