import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { categoryImageUrl } from "@/lib/categoryImages";
import type { Category } from "@/types";

type Props = {
  category: Category;
  onPress: () => void;
  contentCount?: number;
};

export default function CategoryCard({ category, onPress, contentCount = 0 }: Props) {
  const { theme } = useTheme();
  const imageUrl = categoryImageUrl(category.name, category.coverImageUrl);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.surfaceBorder, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {category.name}
        </Text>
        {contentCount > 0 ? (
          <Text style={styles.count}>
            {contentCount} item{contentCount !== 1 ? "s" : ""}
          </Text>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 108,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingRight: 36,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  count: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 4,
  },
  chevron: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -14,
    color: "rgba(255,255,255,0.7)",
    fontSize: 28,
    fontWeight: "300",
  },
});
