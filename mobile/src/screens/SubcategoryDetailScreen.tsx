import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ContentCard from "@/components/ContentCard";
import EmptyState from "@/components/EmptyState";
import SearchBar from "@/components/SearchBar";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import type { ContentItem } from "@/types";
import type { RootStackProps } from "@/navigation/types";

export default function SubcategoryDetailScreen({
  navigation,
  route,
}: RootStackProps<"SubcategoryDetail">) {
  const { subcategoryId, status } = route.params;
  const { theme } = useTheme();
  const utils = trpc.useUtils();
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");

  const subQuery = trpc.subcategories.getById.useQuery({ subcategoryId });
  const contentQuery = trpc.content.listBySubcategory.useQuery({ subcategoryId });
  const categoriesQuery = trpc.categories.list.useQuery();
  const deleteSub = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate();
      navigation.goBack();
    },
  });
  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => utils.content.listBySubcategory.invalidate({ subcategoryId }),
  });

  const sub = subQuery.data;
  const content = contentQuery.data ?? [];

  const filteredContent = useMemo(() => {
    let items = content;
    if (status) items = items.filter((i) => i.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (i) =>
          i.heading.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q))
      );
    }
    return items;
  }, [content, status, query]);

  const confirmDelete = () => {
    Alert.alert("Delete subcategory?", "Content only in this subcategory may be deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSub.mutate({ subcategoryId }) },
    ]);
  };

  const renderContent = ({ item }: { item: ContentItem }) => (
    <View style={styles.colItem}>
      <ContentCard
      item={item}
      categories={categoriesQuery.data}
      onPress={() => navigation.navigate("ContentDetail", { item, subcategoryId })}
      onQueue={() =>
        updateStatus.mutate({
          itemId: item.id,
          status: item.status === "queued" ? "default" : "queued",
        })
      }
      onDone={() =>
        updateStatus.mutate({
          itemId: item.id,
          status: item.status === "done" ? "default" : "done",
        })
      }
    />
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, marginLeft: 4 }}>Back</Text>
        </Pressable>

        {searchMode ? (
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search in subcategory..."
            onCancel={() => {
              setSearchMode(false);
              setQuery("");
            }}
          />
        ) : (
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {sub?.name ?? "Subcategory"}
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => setSearchMode(true)}
                style={[styles.iconBtn, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
              >
                <Ionicons name="search" size={18} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert(sub?.name ?? "Subcategory", undefined, [
                    {
                      text: "Add content",
                      onPress: () =>
                        navigation.navigate("AddContent", {
                          categoryId: sub?.categoryId,
                          subcategoryId,
                        }),
                    },
                    { text: "Delete subcategory", style: "destructive", onPress: confirmDelete },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
                style={[styles.iconBtn, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>
        )}

        {sub?.description ? (
          <Text style={{ color: theme.textMuted, marginTop: 8 }}>{sub.description}</Text>
        ) : null}
        <Text style={{ color: theme.textMuted, marginTop: 4 }}>{filteredContent.length} items</Text>
      </View>

      <FlatList
        data={filteredContent}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderContent}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        refreshControl={
          <RefreshControl
            refreshing={contentQuery.isRefetching}
            onRefresh={() => contentQuery.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={<EmptyState title="No content here" subtitle="Add content from the menu." />}
        contentContainerStyle={styles.listPad}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 32, fontWeight: "800", flex: 1 },
  actions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  columns: { gap: 10, paddingHorizontal: 16 },
  colItem: { flex: 1, maxWidth: "50%" },
  listPad: { paddingBottom: 100 },
});
