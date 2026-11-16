import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CroppedImage } from "./CroppedImage";
import { CATEGORY_IMAGES } from "../lib/constants";
import { useTheme } from "../contexts/ThemeContext";

interface Category {
  id: number;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  coverCropData?: string | null;
  order?: number;
}

interface CategoryCardProps {
  category: Category;
  count?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export function CategoryCard({ category, count, onPress, onLongPress }: CategoryCardProps) {
  const { colors } = useTheme();

  const imageUrl =
    category.coverImageUrl ||
    CATEGORY_IMAGES[category.name] ||
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.glassBorder,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.imageWrapper}>
        <CroppedImage src={imageUrl} cropData={category.coverCropData} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.85)"]}
          style={styles.gradient}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {category.name}
          </Text>
          {count !== undefined && count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          )}
        </View>
        {category.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {category.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 14,
    backgroundColor: "rgba(20, 20, 20, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
    marginTop: 2,
  },
});
