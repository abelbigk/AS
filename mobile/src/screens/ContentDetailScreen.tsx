import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import type { MediaItem } from "@/types";
import type { RootStackProps } from "@/navigation/types";

export default function ContentDetailScreen({ navigation, route }: RootStackProps<"ContentDetail">) {
  const { item: initialItem, categoryId, subcategoryId } = route.params;
  const { theme } = useTheme();
  const utils = trpc.useUtils();
  const [item, setItem] = useState(initialItem);

  const mediaQuery = trpc.media.listByContent.useQuery({ contentItemId: item.id });
  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.content.invalidate();
      const fresh = await utils.content.getById.fetch({ itemId: item.id });
      if (fresh) setItem(fresh as typeof item);
    },
  });
  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.invalidate();
      navigation.goBack();
    },
  });
  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => utils.content.invalidate(),
  });

  const removeFromCategory = () => {
    if (!categoryId) return;
    updateContent.mutate(
      {
        itemId: item.id,
        categoryIds: item.categoryIds.filter((id) => id !== categoryId),
        subcategoryIds: item.subcategoryIds,
      },
      { onSuccess: () => navigation.goBack() }
    );
  };

  const removeFromSubcategory = () => {
    if (!subcategoryId) return;
    updateContent.mutate(
      {
        itemId: item.id,
        categoryIds: item.categoryIds,
        subcategoryIds: item.subcategoryIds.filter((id) => id !== subcategoryId),
      },
      { onSuccess: () => navigation.goBack() }
    );
  };

  const confirmDelete = () => {
    Alert.alert("Delete content?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteItem.mutate({ itemId: item.id }) },
    ]);
  };

  const renderMedia = ({ item: media }: { item: MediaItem }) => (
    <Pressable
      onPress={() => Linking.openURL(media.url)}
      style={[styles.mediaTile, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
    >
      {media.type === "image" ? (
        <Image source={{ uri: media.url }} style={styles.mediaImage} contentFit="cover" />
      ) : (
        <View style={styles.videoTile}>
          <Ionicons name="play-circle" size={36} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12 }}>Video</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={28} color={theme.text} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("EditContent", { itemId: item.id })}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        {item.posterImageUrl ? (
          <Image source={{ uri: item.posterImageUrl }} style={styles.poster} contentFit="cover" />
        ) : null}

        <Text style={[styles.heading, { color: theme.text }]}>{item.heading}</Text>
        {item.description ? (
          <Text style={[styles.desc, { color: theme.textMuted }]}>{item.description}</Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              updateStatus.mutate({
                itemId: item.id,
                status: item.status === "queued" ? "default" : "queued",
              })
            }
            style={[styles.actionBtn, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
          >
            <Ionicons name="time-outline" size={18} color={theme.primary} />
            <Text style={{ color: theme.text }}>{item.status === "queued" ? "Unqueue" : "Queue"}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              updateStatus.mutate({
                itemId: item.id,
                status: item.status === "done" ? "default" : "done",
              })
            }
            style={[styles.actionBtn, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
            <Text style={{ color: theme.text }}>{item.status === "done" ? "Undone" : "Done"}</Text>
          </Pressable>
        </View>

        {categoryId ? (
          <Pressable onPress={removeFromCategory} style={styles.linkBtn}>
            <Text style={{ color: theme.warning }}>Remove from category</Text>
          </Pressable>
        ) : null}
        {subcategoryId ? (
          <Pressable onPress={removeFromSubcategory} style={styles.linkBtn}>
            <Text style={{ color: theme.warning }}>Remove from subcategory</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={confirmDelete} style={styles.linkBtn}>
          <Text style={{ color: theme.danger }}>Delete content</Text>
        </Pressable>

        {(mediaQuery.data ?? []).length > 0 ? (
          <>
            <Text style={[styles.section, { color: theme.textMuted }]}>Media</Text>
            <FlatList
              data={mediaQuery.data ?? []}
              keyExtractor={(m) => String(m.id)}
              renderItem={renderMedia}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pad: { paddingHorizontal: 16, paddingBottom: 32 },
  poster: { width: "100%", aspectRatio: 0.85, borderRadius: 16, marginBottom: 16 },
  heading: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  desc: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  linkBtn: { paddingVertical: 12 },
  section: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 10,
  },
  mediaTile: {
    width: 140,
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  mediaImage: { width: "100%", height: "100%" },
  videoTile: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
