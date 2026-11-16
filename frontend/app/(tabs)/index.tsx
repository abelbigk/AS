import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, ArrowLeft, X } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { DARK_IMAGE, LIGHT_IMAGE } from "../../src/lib/constants";
import { CategoryCard } from "../../src/components/CategoryCard";
import { ContentCard } from "../../src/components/ContentCard";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: categories = [],
    isLoading,
    refetch,
    isRefetching,
  } = trpc.categories.list.useQuery();

  const { data: allSubcategories = [] } = trpc.subcategories.listAll.useQuery(
    undefined,
    { enabled: isSearchMode }
  );

  const { data: searchContents = [], isLoading: searchLoading } =
    trpc.content.search.useQuery(
      { query: searchQuery },
      { enabled: isSearchMode && searchQuery.trim().length > 0 }
    );

  const matchingCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description &&
        c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const matchingSubcategories = allSubcategories.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description &&
        s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const bgImage = theme === "dark" ? DARK_IMAGE : LIGHT_IMAGE;

  return (
    <View style={styles.container}>
      {/* Background Image with Blur Overlay */}
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropOverlay,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(10, 10, 10, 0.55)"
                : "rgba(255, 255, 255, 0.65)",
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 32 : 16),
            paddingBottom: 110,
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
          {isSearchMode ? (
            /* Search Mode Header & Results */
            <View>
              <View style={styles.searchHeader}>
                <Pressable
                  onPress={() => {
                    setIsSearchMode(false);
                    setSearchQuery("");
                  }}
                  style={styles.circleBtn}
                >
                  <ArrowLeft size={20} color={colors.text} />
                </Pressable>

                <View style={styles.searchBar}>
                  <Search
                    size={16}
                    color="rgba(255, 255, 255, 0.4)"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search categories, subcategories, content..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")}>
                      <X size={16} color="rgba(255, 255, 255, 0.4)" />
                    </Pressable>
                  )}
                </View>
              </View>

              {searchQuery.trim().length === 0 ? (
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchTitle}>Search for everything</Text>
                  <Text style={styles.emptySearchSubtitle}>
                    Find categories, subcategories, or contents by name and description.
                  </Text>
                </View>
              ) : (
                <View style={styles.searchResultsList}>
                  {/* Categories match */}
                  {matchingCategories.length > 0 && (
                    <View style={styles.searchSection}>
                      <Text style={styles.sectionHeader}>
                        CATEGORIES ({matchingCategories.length})
                      </Text>
                      {matchingCategories.map((cat) => (
                        <CategoryCard
                          key={cat.id}
                          category={cat}
                          onPress={() => router.push(`/category/${cat.id}`)}
                        />
                      ))}
                    </View>
                  )}

                  {/* Contents match */}
                  {searchLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  ) : searchContents.length > 0 ? (
                    <View style={styles.searchSection}>
                      <Text style={styles.sectionHeader}>
                        CONTENTS ({searchContents.length})
                      </Text>
                      {searchContents.map((item) => (
                        <ContentCard
                          key={item.id}
                          item={item as any}
                          onPress={() => {}}
                        />
                      ))}
                    </View>
                  ) : null}

                  {matchingCategories.length === 0 &&
                    matchingSubcategories.length === 0 &&
                    !searchLoading &&
                    searchContents.length === 0 && (
                      <View style={styles.emptySearch}>
                        <Text style={styles.emptySearchTitle}>No results found</Text>
                        <Text style={styles.emptySearchSubtitle}>
                          Try typing a different search query.
                        </Text>
                      </View>
                    )}
                </View>
              )}
            </View>
          ) : (
            /* Default Home View */
            <View>
              {isLoading ? (
                <View style={styles.fullLoadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : (
                <View>
                  {/* Header matching original web app */}
                  <View style={styles.headerRow}>
                    <View>
                      <Text style={styles.pageTitle}>My</Text>
                      <Text style={styles.categoriesCount}>
                        {categories.length} categories
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setIsSearchMode(true)}
                      style={styles.circleBtn}
                    >
                      <Search size={20} color={colors.text} />
                    </Pressable>
                  </View>

                  {/* Categories Vertical List */}
                  {categories.length > 0 ? (
                    <View style={styles.categoryList}>
                      {categories.map((category) => (
                        <CategoryCard
                          key={category.id}
                          category={category}
                          onPress={() => router.push(`/category/${category.id}`)}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No categories yet</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
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
      } as any,
    }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 672, // max-w-2xl
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 44,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  categoriesCount: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 6,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryList: {
    gap: 4,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    height: "100%",
  },
  emptySearch: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    textAlign: "center",
  },
  emptySearchTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
  },
  emptySearchSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 4,
    textAlign: "center",
    maxWidth: 320,
  },
  searchResultsList: {
    gap: 24,
  },
  searchSection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.45)",
    letterSpacing: 0.8,
  },
  fullLoadingContainer: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
  },
  emptyText: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.6)",
  },
});
