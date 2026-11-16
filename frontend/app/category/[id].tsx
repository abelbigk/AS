import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CATEGORY_IMAGES } from "../../src/lib/constants";
import { ContentCard } from "../../src/components/ContentCard";

export default function CategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | undefined>();

  const { data: category, isLoading: catLoading } =
    trpc.categories.getById.useQuery({ categoryId });

  const { data: subcategories = [] } =
    trpc.subcategories.list.useQuery({ categoryId });

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch,
    isRefetching,
  } = trpc.content.listByCategory.useQuery({
    categoryId,
    subcategoryId: selectedSubcategoryId,
  });

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
    },
  });

  const coverUrl =
    category?.coverImageUrl ||
    (category?.name ? CATEGORY_IMAGES[category.name] : null) ||
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80";

  return (
    <View style={styles.container}>
      {/* Category Cover Image Header */}
      <View style={styles.headerImageContainer}>
        <Image
          source={{ uri: coverUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.55)" },
          ]}
        />

        <View
          style={[
            styles.headerNav,
            { paddingTop: insets.top + 8, paddingHorizontal: 16 },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.categoryTitle}>{category?.name || "Category"}</Text>
          {category?.description ? (
            <Text style={styles.categoryDesc}>{category.description}</Text>
          ) : null}
        </View>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 },
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
          {/* Subcategory Pills */}
          {subcategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.subcategoriesScroll}
              contentContainerStyle={styles.subcategoriesContainer}
            >
              <Pressable
                onPress={() => setSelectedSubcategoryId(undefined)}
                style={[
                  styles.subcatPill,
                  {
                    backgroundColor:
                      selectedSubcategoryId === undefined
                        ? colors.accent
                        : colors.surfaceHover,
                    borderColor:
                      selectedSubcategoryId === undefined
                        ? colors.accent
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subcatText,
                    {
                      color:
                        selectedSubcategoryId === undefined
                          ? "#FFF"
                          : colors.text,
                    },
                  ]}
                >
                  All
                </Text>
              </Pressable>

              {subcategories.map((sub) => {
                const isSelected = selectedSubcategoryId === sub.id;
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => setSelectedSubcategoryId(sub.id)}
                    style={[
                      styles.subcatPill,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : colors.surfaceHover,
                        borderColor: isSelected
                          ? colors.accent
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subcatText,
                        { color: isSelected ? "#FFF" : colors.text },
                      ]}
                    >
                      {sub.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Items Header */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Items ({items.length})
            </Text>

            <Pressable
              onPress={() => router.push("/add")}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Plus size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {itemsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : null}

          {!itemsLoading && items.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No items in this category yet.
              </Text>
            </View>
          )}

          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item as any}
              onPress={() => {}}
              onUpdateStatus={(newStatus) =>
                updateStatus.mutate({ itemId: item.id, status: newStatus })
              }
              onDelete={() => deleteItem.mutate({ itemId: item.id })}
            />
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
  headerImageContainer: {
    height: 220,
    justifyContent: "space-between",
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  categoryDesc: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 640,
  },
  subcategoriesScroll: {
    marginBottom: 16,
  },
  subcategoriesContainer: {
    gap: 8,
  },
  subcatPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subcatText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
});
