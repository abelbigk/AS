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

export default function CategoryDetailScreen({ navigation, route }: RootStackProps<"CategoryDetail">) {
  const { categoryId, status } = route.params;
  const { theme } = useTheme();
  const utils = trpc.useUtils();
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const categoriesQuery = trpc.categories.list.useQuery();
  const subsQuery = trpc.subcategories.list.useQuery({ categoryId });
  const contentQuery = trpc.content.listByCategory.useQuery({ categoryId });
  const countsQuery = trpc.subcategories.getContentCounts.useQuery({ categoryId });
  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      navigation.popToTop();
    },
  });
  const batchRemove = trpc.content.batchRemoveFromCategory.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      setSelectMode(false);
      setSelected(new Set());
    },
  });
  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => utils.content.listByCategory.invalidate(),
  });

  const category = categoriesQuery.data?.find((c) => c.id === categoryId);
  const subcategories = subsQuery.data ?? [];
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

  const refresh = async () => {
    await Promise.all([
      utils.subcategories.list.invalidate({ categoryId }),
      utils.content.listByCategory.invalidate({ categoryId }),
    ]);
  };

  const confirmDelete = () => {
    Alert.alert("Delete category?", "This removes the category and unlinked-only content.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCategory.mutate({ categoryId }) },
    ]);
  };

  const confirmBatchRemove = () => {
    Alert.alert("Remove items?", `Remove ${selected.size} items from this category?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          batchRemove.mutate({ categoryId, itemIds: Array.from(selected) }),
      },
    ]);
  };

  const renderContent = ({ item }: { item: ContentItem }) => (
    <View style={styles.colItem}>
      <ContentCard
      item={item}
      categories={categoriesQuery.data}
      subcategories={subsQuery.data}
      selectMode={selectMode}
      selected={selected.has(item.id)}
      onToggleSelect={() => {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      }}
      onPress={() => navigation.navigate("ContentDetail", { item, categoryId })}
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
            placeholder="Search in category..."
            onCancel={() => {
              setSearchMode(false);
              setQuery("");
            }}
          />
        ) : (
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {category?.name ?? "Category"}
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
                  Alert.alert(category?.name ?? "Category", undefined, [
                    { text: "Add content", onPress: () => navigation.navigate("AddContent", { categoryId }) },
                    { text: "Add subcategory", onPress: () => navigation.navigate("AddSubcategory", { categoryId }) },
                    { text: "Remove contents", onPress: () => setSelectMode(true) },
                    { text: "Delete category", style: "destructive", onPress: confirmDelete },
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

        {category?.description ? (
          <Text style={{ color: theme.textMuted, marginTop: 8 }}>{category.description}</Text>
        ) : null}
        <Text style={{ color: theme.textMuted, marginTop: 4 }}>
          {filteredContent.length} items · {subcategories.length} subcategories
        </Text>
      </View>

      <FlatList
        data={filteredContent}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderContent}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        refreshControl={
          <RefreshControl refreshing={contentQuery.isRefetching} onRefresh={refresh} tintColor={theme.primary} />
        }
        ListHeaderComponent={
          subcategories.length > 0 ? (
            <View style={styles.subSection}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Subcategories</Text>
              {subcategories.map((sub) => (
                <Pressable
                  key={sub.id}
                  onPress={() => navigation.navigate("SubcategoryDetail", { subcategoryId: sub.id, status })}
                  style={[styles.subRow, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                >
                  <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{sub.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    {countsQuery.data?.[sub.id] ?? 0}
                  </Text>
                </Pressable>
              ))}
              <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 16 }]}>Content</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState title="No content here" subtitle="Add content from the menu." />
        }
        contentContainerStyle={styles.listPad}
      />

      {selectMode ? (
        <View style={[styles.batchBar, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <Text style={{ color: theme.text }}>{selected.size} selected</Text>
          <View style={styles.batchActions}>
            <Pressable onPress={() => { setSelectMode(false); setSelected(new Set()); }}>
              <Text style={{ color: theme.textMuted }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirmBatchRemove}
              disabled={selected.size === 0}
              style={[styles.removeBtn, { backgroundColor: theme.danger, opacity: selected.size ? 1 : 0.5 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  subSection: { marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  subRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  columns: { gap: 10, paddingHorizontal: 16 },
  colItem: { flex: 1, maxWidth: "50%" },
  listPad: { paddingBottom: 120 },
  batchBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  batchActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  removeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
