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
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { DARK_IMAGE, LIGHT_IMAGE } from "../../src/lib/constants";
import { CategoryCard } from "../../src/components/CategoryCard";
import { ContentCard } from "../../src/components/ContentCard";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  const {
    data: categories = [],
    isLoading,
    refetch,
    isRefetching,
  } = trpc.categories.list.useQuery();

  const { data: searchResults = [], isLoading: searchLoading } =
    trpc.content.search.useQuery(
      { query: searchQuery },
      { enabled: searchQuery.trim().length > 0 }
    );

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bgImage = theme === "dark" ? DARK_IMAGE : LIGHT_IMAGE;

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(10, 10, 10, 0.75)"
                : "rgba(248, 250, 252, 0.75)",
          },
        ]}
      />

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 110 },
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
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.appTitle, { color: colors.text }]}>AS</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Content Organizer
              </Text>
            </View>

            <Pressable
              onPress={() => setIsSearchActive(!isSearchActive)}
              style={[styles.searchToggleBtn, { backgroundColor: colors.glassBg }]}
            >
              <Search size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Search Input Bar */}
          {isSearchActive && (
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.glassBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={18} color={colors.textSubtle} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search categories or items..."
                placeholderTextColor={colors.textSubtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <X size={18} color={colors.textSubtle} />
                </Pressable>
              )}
            </View>
          )}

          {/* Loading Indicator */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : null}

          {/* Search Results for Content Items if active */}
          {searchQuery.trim().length > 0 && searchResults.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Matching Items ({searchResults.length})
              </Text>
              {searchResults.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item as any}
                  onPress={() => {
                    // Open item or navigate
                  }}
                />
              ))}
            </View>
          )}

          {/* Categories Grid / List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {searchQuery ? "Matching Categories" : "Categories"} (
              {filteredCategories.length})
            </Text>

            {filteredCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onPress={() => router.push(`/category/${cat.id}`)}
              />
            ))}

            {filteredCategories.length === 0 && !isLoading && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No categories found.
                </Text>
              </View>
            )}
          </View>
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
    maxWidth: 640,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  searchToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
});
