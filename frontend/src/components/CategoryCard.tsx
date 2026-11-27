import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CroppedImage } from "./CroppedImage";
import { CATEGORY_IMAGES } from "../lib/constants";

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
  contentCount?: number;
  onPress?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
}

export function CategoryCard({
  category,
  count,
  contentCount,
  onPress,
  onClick,
}: CategoryCardProps) {
  const displayCount = count ?? contentCount;
  const handlePress = onPress ?? onClick ?? (() => {});

  const imageUrl =
    category.coverImageUrl ||
    CATEGORY_IMAGES[category.name] ||
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80";

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Background Image */}
      <View style={styles.imageWrapper}>
        <CroppedImage src={imageUrl} cropData={category.coverCropData} />
      </View>

      {/* Gradient Overlay matching web: from-black/55 via-black/20 to-transparent */}
      <LinearGradient
        colors={["rgba(0,0,0,0.65)", "rgba(0,0,0,0.3)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {category.name}
          </Text>
          {displayCount !== undefined && displayCount > 0 && (
            <Text style={styles.countText}>
              {displayCount} item{displayCount !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 112,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moreBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
});
