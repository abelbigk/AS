import React from "react";
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
import { ArrowLeft } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { DARK_IMAGE, LIGHT_IMAGE } from "../../src/lib/constants";
import { ContentCard } from "../../src/components/ContentCard";

export default function SubcategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subcategoryId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();

  const { data: subcategory } =
    trpc.subcategories.getById.useQuery({ subcategoryId });

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch,
    isRefetching,
  } = trpc.content.listBySubcategory.useQuery({ subcategoryId });

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listBySubcategory.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listBySubcategory.invalidate();
    },
  });

  const bgImage = theme === "dark" ? DARK_IMAGE : LIGHT_IMAGE;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(10, 10, 10, 0.85)"
                : "rgba(248, 250, 252, 0.85)",
          },
        ]}
      />

      {/* Nav header */}
      <View
        style={[
          styles.headerNav,
          { paddingTop: insets.top + 8, paddingHorizontal: 16 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.title, { color: colors.text }]}>
            {subcategory?.name || "Subcategory"}
          </Text>
          {subcategory?.description ? (
            <Text style={[styles.desc, { color: colors.textMuted }]}>
              {subcategory.description}
            </Text>
          ) : null}
        </View>
      </View>

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
          {itemsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : null}

          {!itemsLoading && items.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No items in this subcategory yet.
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
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  desc: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 640,
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
