import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CategoryCard } from "../../src/components/CategoryCard";

const DARK_BG = "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1600&q=80";
const LIGHT_BG = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80";

function SubcategoryPill({
  subId,
  count,
  onPress,
}: {
  subId: number;
  count: number;
  onPress: () => void;
}) {
  const { data: sub } = trpc.subcategories.getById.useQuery({ subcategoryId: subId });

  return (
    <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.pillText} numberOfLines={1}>
        {sub?.name ?? "…"}
      </Text>
      <View style={styles.pillBadge}>
        <Text style={styles.pillBadgeText}>{count}</Text>
      </View>
      <ArrowRight size={12} color="rgba(255,255,255,0.6)" />
    </TouchableOpacity>
  );
}

export default function DoneScreen() {
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const router = useRouter();

  const {
    data: items = [],
    isLoading,
    refetch,
    isRefetching,
  } = trpc.content.listByStatus.useQuery("done");

  const { data: categories = [] } = trpc.categories.list.useQuery();
  const { data: allSubcategories = [] } = trpc.subcategories.listAll.useQuery();

  const bgImage = theme === "dark" ? DARK_BG : LIGHT_BG;
  const overlayColor =
    theme === "dark" ? "rgba(10,10,10,0.55)" : "rgba(255,255,255,0.65)";

  // Build category groups
  const groups = useMemo(() => {
    // map subcategoryId -> categoryId
    const subToCat = new Map<number, number>();
    for (const sub of allSubcategories) {
      if (sub.categoryId != null) {
        subToCat.set(sub.id, sub.categoryId);
      }
    }

    // categoryId -> { category, subIds: Set<number>, directCount: number, subCounts: Map<number, number> }
    const map = new Map<
      number,
      {
        category: (typeof categories)[0];
        subIds: Set<number>;
        directCount: number;
        subCounts: Map<number, number>;
      }
    >();

    const ensureGroup = (catId: number) => {
      if (!map.has(catId)) {
        const cat = categories.find((c) => c.id === catId);
        if (cat) {
          map.set(catId, {
            category: cat,
            subIds: new Set(),
            directCount: 0,
            subCounts: new Map(),
          });
        }
      }
      return map.get(catId);
    };

    for (const item of items) {
      const anyItem = item as any;

      // Direct category IDs on the item
      const catIds: number[] = anyItem.categoryIds ?? (anyItem.categoryId != null ? [anyItem.categoryId] : []);
      // Subcategory IDs on the item
      const subIds: number[] = anyItem.subcategoryIds ?? (anyItem.subcategoryId != null ? [anyItem.subcategoryId] : []);

      // For each subcategory, find parent category
      const parentCatIdsFromSubs = new Set<number>();
      for (const subId of subIds) {
        const parentCatId = subToCat.get(subId);
        if (parentCatId != null) {
          parentCatIdsFromSubs.add(parentCatId);
          const group = ensureGroup(parentCatId);
          if (group) {
            group.subIds.add(subId);
            group.subCounts.set(subId, (group.subCounts.get(subId) ?? 0) + 1);
          }
        }
      }

      // For each direct category (that isn't already counted via subcategory)
      for (const catId of catIds) {
        if (!parentCatIdsFromSubs.has(catId)) {
          const group = ensureGroup(catId);
          if (group) {
            group.directCount += 1;
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const totalA = a.directCount + a.subIds.size;
      const totalB = b.directCount + b.subIds.size;
      return totalB - totalA;
    });
  }, [items, categories, allSubcategories]);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: 110 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthWrapper}>
          {/* Centered title */}
          <Text style={styles.pageTitle}>Completed</Text>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}

          {!isLoading && items.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: "#fff" }]}>
                Nothing completed yet
              </Text>
              <Text style={[styles.emptySubtext, { color: "rgba(255,255,255,0.6)" }]}>
                Mark items as finished to see them grouped here.
              </Text>
            </View>
          )}

          {!isLoading &&
            groups.map(({ category, subIds, directCount, subCounts }) => (
              <View key={category.id} style={styles.groupWrapper}>
                <CategoryCard
                  category={category}
                  count={directCount > 0 ? directCount : undefined}
                  onPress={() =>
                    router.push(`/category/${category.id}?status=done` as any)
                  }
                />

                {subIds.size > 0 && (
                  <View style={styles.subcategorySection}>
                    <Text style={styles.subcategoryLabel}>SUBCATEGORIES</Text>
                    <View style={styles.pillsRow}>
                      {Array.from(subIds).map((subId) => (
                        <SubcategoryPill
                          key={subId}
                          subId={subId}
                          count={subCounts.get(subId) ?? 0}
                          onPress={() =>
                            router.push(`/subcategory/${subId}?status=done` as any)
                          }
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 672,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
  groupWrapper: {
    marginBottom: 20,
  },
  subcategorySection: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(255,255,255,0.1)",
  },
  subcategoryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    maxWidth: 140,
  },
  pillBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
});
