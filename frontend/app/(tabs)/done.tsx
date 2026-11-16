import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CategoryCard } from "../../src/components/CategoryCard";

const DARK_BG =
  "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1600&q=80";
const LIGHT_BG =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80";

function SubcategoryPill({
  subId,
  count,
  onPress,
}: {
  subId: number;
  count: number;
  onPress: () => void;
}) {
  const { data: sub } = trpc.subcategories.getById.useQuery({
    subcategoryId: subId,
  });

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={onPress}
      activeOpacity={0.75}
    >
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
    const subToCat = new Map<number, number>();
    for (const sub of allSubcategories) {
      if (sub.categoryId != null) {
        subToCat.set(sub.id, sub.categoryId);
      }
    }

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
      const catIds: number[] =
        anyItem.categoryIds ??
        (anyItem.categoryId != null ? [anyItem.categoryId] : []);
      const subIds: number[] =
        anyItem.subcategoryIds ??
        (anyItem.subcategoryId != null ? [anyItem.subcategoryId] : []);

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
      {/* Blurred background matching app style */}
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={Platform.OS !== "web" ? 25 : undefined}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropOverlay,
          { backgroundColor: overlayColor },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 24 : 12),
            paddingBottom: insets.bottom + 110,
          },
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
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            Completed
          </Text>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}

          {!isLoading && items.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Nothing completed yet
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: colors.textMuted },
                ]}
              >
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
                    router.push(`/category/${category.id}?status=done`)
                  }
                />

                {subIds.size > 0 && (
                  <View style={styles.subcategoriesBlock}>
                    <Text style={styles.subcategoriesHeading}>
                      SUBCATEGORIES
                    </Text>
                    <View style={styles.pillsRow}>
                      {Array.from(subIds).map((subId) => (
                        <SubcategoryPill
                          key={subId}
                          subId={subId}
                          count={subCounts.get(subId) ?? 0}
                          onPress={() =>
                            router.push(
                              `/subcategory/${subId}?status=done`
                            )
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
    backgroundColor: "#0A0A0A",
  },
  backdropOverlay: {
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      } as any,
    }),
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
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  groupWrapper: {
    marginBottom: 24,
    width: "100%",
  },
  subcategoriesBlock: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(255,255,255,0.15)",
    paddingLeft: 12,
    marginTop: 8,
    gap: 8,
  },
  subcategoriesHeading: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.4)",
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
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
    maxWidth: 140,
  },
  pillBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  pillBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
});
