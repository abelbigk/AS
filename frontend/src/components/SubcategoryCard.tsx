import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2 } from "lucide-react-native";
import { Image } from "expo-image";
import { useTheme } from "../contexts/ThemeContext";

interface SubcategoryCardProps {
  subcategory: {
    id: number;
    name: string;
    description?: string | null;
    coverImageUrl?: string | null;
    coverCropData?: string | null;
    categoryId?: number;
  };
  count?: number;
  isSelectMode?: boolean;
  selected?: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function SubcategoryCard({
  subcategory,
  count = 0,
  isSelectMode,
  selected,
  onPress,
}: SubcategoryCardProps) {
  const { colors, theme } = useTheme();
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor:
            theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "#FFFFFF",
          borderColor: selected
            ? "#3B82F6"
            : theme === "dark"
            ? "rgba(255, 255, 255, 0.12)"
            : colors.border,
          borderWidth: selected ? 2 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Selection checkbox */}
      {isSelectMode && (
        <View style={styles.selectionCheckbox}>
          <View
            style={[
              styles.checkboxBox,
              selected
                ? { backgroundColor: "#3B82F6", borderColor: "#3B82F6" }
                : { backgroundColor: "rgba(0, 0, 0, 0.45)", borderColor: "rgba(255, 255, 255, 0.4)" },
            ]}
          >
            <CheckCircle2
              size={14}
              color={selected ? "#FFFFFF" : "transparent"}
            />
          </View>
        </View>
      )}

      {subcategory.coverImageUrl ? (
        <View style={[styles.imageWrapper, { aspectRatio }]}>
          <Image
            source={{ uri: subcategory.coverImageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            onLoad={(e) => {
              if (e.source.width && e.source.height) {
                // Constrain aspect ratio between 0.65 and 1.8 for balanced masonry layout
                const rawRatio = e.source.width / e.source.height;
                const clamped = Math.max(0.65, Math.min(1.8, rawRatio));
                setAspectRatio(clamped);
              }
            }}
          />
          <LinearGradient
            colors={["transparent", "rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.85)"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top-right count badge */}
          <View style={styles.topRightRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          </View>

          {/* Bottom text overlay */}
          <View style={styles.bottomInfo}>
            <Text style={styles.name} numberOfLines={2}>
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
          <View style={styles.topRightRow}>
            <View style={[styles.countBadge, { backgroundColor: colors.surfaceHover }]}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>{count}</Text>
            </View>
          </View>

          <View style={styles.bottomInfoNoImage}>
            <Text style={[styles.nameNoImage, { color: colors.text }]} numberOfLines={2}>
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
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
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
  selectionCheckbox: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 25,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    width: "100%",
    position: "relative",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  topRightRow: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  moreBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
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
