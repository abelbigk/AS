import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import CategoryCard from "@/components/CategoryCard";
import ContentCard from "@/components/ContentCard";
import EmptyState from "@/components/EmptyState";
import SearchBar from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import type { Category, ContentItem } from "@/types";
import type { TabProps } from "@/navigation/types";

export default function HomeScreen({ navigation }: TabProps<"Home">) {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");

  const categoriesQuery = trpc.categories.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const initMutation = trpc.categories.initializePredefined.useMutation();
  const reorderMutation = trpc.categories.reorder.useMutation();
  const subcategoriesQuery = trpc.subcategories.listAll.useQuery(undefined, {
    enabled: searchMode && query.trim().length > 0,
  });
  const searchQuery = trpc.content.search.useQuery(
    { query },
    { enabled: searchMode && query.trim().length > 0 }
  );

  useEffect(() => {
    if (isAuthenticated && !initMutation.isPending && !initMutation.isSuccess) {
      initMutation.mutate();
    }
  }, [isAuthenticated]);

  const categories = categoriesQuery.data ?? [];

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, query]);

  const filteredSubs = useMemo(() => {
    const subs = subcategoriesQuery.data ?? [];
    if (!query.trim()) return subs;
    const q = query.toLowerCase();
    return subs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subcategoriesQuery.data, query]);

  const refresh = useCallback(async () => {
    await utils.categories.list.invalidate();
  }, [utils]);

  const onDragEnd = ({ data }: { data: Category[] }) => {
    utils.categories.list.setData(undefined, data);
    reorderMutation.mutate(
      { categoryIds: data.map((c) => c.id) },
      {
        onError: () => {
          utils.categories.list.invalidate();
          Alert.alert("Error", "Failed to save order");
        },
      }
    );
  };

  const renderCategory = ({ item, drag, isActive }: RenderItemParams<Category>) => (
    <Pressable onLongPress={drag} disabled={isActive || searchMode}>
      <CategoryCard
        category={item}
        onPress={() => navigation.navigate("CategoryDetail", { categoryId: item.id })}
      />
    </Pressable>
  );

  if (categoriesQuery.isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background, justifyContent: "center" }]}>
        <Text style={{ color: theme.textMuted, textAlign: "center" }}>Loading...</Text>
      </View>
    );
  }

  if (searchMode) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.headerPad}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search categories, subcategories, content..."
            onCancel={() => {
              setSearchMode(false);
              setQuery("");
            }}
          />
        </View>
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View>
              {filteredCategories.length > 0 ? (
                <>
                  <Text style={[styles.section, { color: theme.textMuted }]}>
                    Categories ({filteredCategories.length})
                  </Text>
                  {filteredCategories.map((c) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      onPress={() => navigation.navigate("CategoryDetail", { categoryId: c.id })}
                    />
                  ))}
                </>
              ) : null}
              {filteredSubs.length > 0 ? (
                <>
                  <Text style={[styles.section, { color: theme.textMuted }]}>
                    Subcategories ({filteredSubs.length})
                  </Text>
                  {filteredSubs.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => navigation.navigate("SubcategoryDetail", { subcategoryId: s.id })}
                      style={[styles.subRow, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                    >
                      <Text style={{ color: theme.text, fontWeight: "600" }}>{s.name}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
              {(searchQuery.data ?? []).length > 0 ? (
                <>
                  <Text style={[styles.section, { color: theme.textMuted }]}>
                    Content ({searchQuery.data?.length ?? 0})
                  </Text>
                  {(searchQuery.data ?? []).map((item: ContentItem) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      categories={categories}
                      subcategories={subcategoriesQuery.data}
                      onPress={() => navigation.navigate("ContentDetail", { item })}
                    />
                  ))}
                </>
              ) : null}
              {query.trim() &&
              filteredCategories.length === 0 &&
              filteredSubs.length === 0 &&
              (searchQuery.data ?? []).length === 0 ? (
                <EmptyState title="No results found" subtitle="Try a different search." />
              ) : null}
            </View>
          }
          contentContainerStyle={styles.pad}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={theme.primary} />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.headerPad}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>My</Text>
            <Text style={{ color: theme.textMuted }}>{categories.length} categories</Text>
          </View>
          <Pressable
            onPress={() => setSearchMode(true)}
            style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
          >
            <Ionicons name="search" size={20} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <DraggableFlatList
        data={categories}
        onDragEnd={onDragEnd}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCategory}
        refreshControl={
          <RefreshControl
            refreshing={categoriesQuery.isRefetching}
            onRefresh={refresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.pad}
        ListEmptyComponent={<EmptyState title="No categories yet" subtitle="Tap New to create one." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerPad: { paddingHorizontal: 16, paddingTop: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  title: { fontSize: 36, fontWeight: "800" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pad: { paddingHorizontal: 16, paddingBottom: 100 },
  section: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 12,
  },
  subRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
});
