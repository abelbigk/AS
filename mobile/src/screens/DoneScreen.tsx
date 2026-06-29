import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryCard from "@/components/CategoryCard";
import EmptyState from "@/components/EmptyState";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import type { TabProps } from "@/navigation/types";

export default function DoneScreen({ navigation }: TabProps<"Done">) {
  const { theme } = useTheme();
  const itemsQuery = trpc.content.listByStatus.useQuery("done");
  const categoriesQuery = trpc.categories.list.useQuery();
  const subsQuery = trpc.subcategories.listAll.useQuery();

  const grouped = useMemo(() => {
    const items = itemsQuery.data ?? [];
    const categories = categoriesQuery.data ?? [];
    const subs = subsQuery.data ?? [];
    const map = new Map<number, { category: (typeof categories)[0]; count: number }>();

    items.forEach((item) => {
      const catIds = new Set<number>(item.categoryIds);
      item.subcategoryIds.forEach((subId) => {
        const sub = subs.find((s) => s.id === subId);
        if (sub) catIds.add(sub.categoryId);
      });
      catIds.forEach((catId) => {
        const cat = categories.find((c) => c.id === catId);
        if (!cat) return;
        const existing = map.get(catId);
        if (existing) existing.count += 1;
        else map.set(catId, { category: cat, count: 1 });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [itemsQuery.data, categoriesQuery.data, subsQuery.data]);

  const loading = itemsQuery.isLoading || categoriesQuery.isLoading;

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background, justifyContent: "center" }]}>
        <Text style={{ color: theme.textMuted, textAlign: "center" }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={styles.headerPad}>
        <Text style={[styles.title, { color: theme.text }]}>Done</Text>
        <Text style={{ color: theme.textMuted, marginBottom: 16 }}>
          {itemsQuery.data?.length ?? 0} completed items
        </Text>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(item) => String(item.category.id)}
        refreshControl={
          <RefreshControl
            refreshing={itemsQuery.isRefetching}
            onRefresh={() => itemsQuery.refetch()}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          <CategoryCard
            category={item.category}
            contentCount={item.count}
            onPress={() =>
              navigation.navigate("CategoryDetail", { categoryId: item.category.id, status: "done" })
            }
          />
        )}
        ListEmptyComponent={<EmptyState title="No completed items" subtitle="Mark content as done from any card." />}
        contentContainerStyle={styles.listPad}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerPad: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 34, fontWeight: "800" },
  listPad: { paddingBottom: 100 },
});
