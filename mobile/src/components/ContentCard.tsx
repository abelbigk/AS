import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { getCategoryLabel } from "@/lib/categoryImages";
import type { Category, ContentItem, Subcategory } from "@/types";

type Props = {
  item: ContentItem;
  categories?: Category[];
  subcategories?: Subcategory[];
  onPress: () => void;
  onQueue?: () => void;
  onDone?: () => void;
  selected?: boolean;
  selectMode?: boolean;
  onToggleSelect?: () => void;
};

function ContentCardInner({
  item,
  categories,
  subcategories,
  onPress,
  onQueue,
  onDone,
  selected,
  selectMode,
  onToggleSelect,
}: Props) {
  const { theme } = useTheme();
  const label = getCategoryLabel(
    item.categoryIds,
    item.subcategoryIds,
    categories,
    subcategories
  );

  return (
    <Pressable
      onPress={selectMode ? onToggleSelect : onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: selected ? theme.primary : theme.surfaceBorder,
          opacity: pressed ? 0.94 : 1,
        },
        selected && styles.selected,
      ]}
    >
      {selectMode ? (
        <View style={[styles.check, { borderColor: selected ? theme.primary : theme.textMuted }]}>
          {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>
      ) : null}

      {item.posterImageUrl ? (
        <Image
          source={{ uri: item.posterImageUrl }}
          style={styles.poster}
          contentFit="cover"
          recyclingKey={`poster-${item.id}`}
        />
      ) : (
        <View style={[styles.posterPlaceholder, { backgroundColor: theme.surfaceBorder }]} />
      )}

      {item.status !== "default" ? (
        <View
          style={[
            styles.statusPill,
            { backgroundColor: item.status === "queued" ? theme.primary : theme.success },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        {label ? (
          <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <Text style={[styles.heading, { color: theme.text }]} numberOfLines={3}>
          {item.heading}
        </Text>
        {item.description ? (
          <Text style={[styles.desc, { color: theme.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {!selectMode && (onQueue || onDone) ? (
          <View style={styles.actions}>
            {onQueue ? (
              <Pressable onPress={onQueue} style={[styles.actionBtn, { borderColor: theme.surfaceBorder }]}>
                <Ionicons
                  name={item.status === "queued" ? "time" : "time-outline"}
                  size={16}
                  color={theme.primary}
                />
              </Pressable>
            ) : null}
            {onDone ? (
              <Pressable onPress={onDone} style={[styles.actionBtn, { borderColor: theme.surfaceBorder }]}>
                <Ionicons
                  name={item.status === "done" ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={16}
                  color={theme.success}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default memo(ContentCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 12,
  },
  selected: {
    borderWidth: 2,
  },
  check: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  poster: { width: "100%", aspectRatio: 0.85 },
  posterPlaceholder: { width: "100%", height: 96 },
  statusPill: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  body: { padding: 12 },
  label: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  heading: { fontSize: 14, fontWeight: "700", lineHeight: 19 },
  desc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
