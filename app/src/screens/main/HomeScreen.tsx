import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/lib/trpc';

export default function HomeScreen({ navigation }: any) {
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowDimensions();

  const { data: categories = [], isLoading, refetch } = trpc.categories.list.useQuery();
  const { data: allSubcategories = [], isLoading: subsLoading } = trpc.subcategories.list.useQuery(
    { categoryId: 0 },
    { enabled: searchActive && searchQuery.length > 0 }
  );
  const { data: searchContents = [], isLoading: contentsLoading } = trpc.content.search.useQuery(
    { query: searchQuery },
    { enabled: searchActive && searchQuery.length > 0 }
  );

  const filteredCategories = searchActive
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : categories;

  const filteredSubcategories = searchActive
    ? allSubcategories.filter((sub) =>
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.description && sub.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const renderCategoryCard = ({ item: category }: any) => (
    <TouchableOpacity
      style={[styles.categoryCard, { width: width / 2 - 12 }]}
      onPress={() =>
        navigation.navigate('category-detail', { categoryId: category.id })
      }
    >
      <View style={styles.cardContent}>
        <Ionicons name="folder" size={32} color="#007AFF" />
        <Text style={styles.categoryName}>{category.name}</Text>
        {category.description && (
          <Text style={styles.categoryDesc} numberOfLines={2}>
            {category.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSubcategoryItem = ({ item: sub }: any) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() =>
        navigation.navigate('subcategory-detail', { subcategoryId: sub.id })
      }
    >
      <View style={styles.itemIcon}>
        <Ionicons name="layers" size={20} color="#007AFF" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{sub.name}</Text>
        {sub.description && (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {sub.description}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderContentItem = ({ item: content }: any) => (
    <TouchableOpacity style={styles.listItem}>
      <View style={styles.itemIcon}>
        <Ionicons name="document" size={20} color="#4caf50" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{content.heading}</Text>
        {content.link && (
          <Text style={styles.itemLink} numberOfLines={1}>
            {content.link}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const sections = [];

  if (searchActive) {
    if (filteredCategories.length > 0) {
      sections.push({
        title: `Categories (${filteredCategories.length})`,
        data: filteredCategories.map((c) => ({ ...c, type: 'category' })),
      });
    }
    if (filteredSubcategories.length > 0) {
      sections.push({
        title: `Subcategories (${filteredSubcategories.length})`,
        data: filteredSubcategories.map((s) => ({ ...s, type: 'subcategory' })),
      });
    }
    if (searchContents.length > 0) {
      sections.push({
        title: `Content (${searchContents.length})`,
        data: searchContents.map((c) => ({ ...c, type: 'content' })),
      });
    }
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        {searchActive && (
          <TouchableOpacity
            onPress={() => {
              setSearchActive(false);
              setSearchQuery('');
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.searchInput, searchActive && { flex: 1, marginHorizontal: 8 }]}
          placeholder={searchActive ? 'Search categories, items...' : 'Search'}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchActive(true)}
        />
        {!searchActive && (
          <TouchableOpacity onPress={() => setSearchActive(true)}>
            <Ionicons name="search" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('add-category')}>
          <Ionicons name="add-circle" size={28} color="#007AFF" style={{ marginLeft: 12 }} />
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {searchActive && searchQuery ? (
        <FlatList
          data={sections}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item: section }: any) => (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {section.data.map((item: any) => (
                <View key={item.id || item.heading}>
                  {item.type === 'category' && renderCategoryCard({ item })}
                  {item.type === 'subcategory' && renderSubcategoryItem({ item })}
                  {item.type === 'content' && renderContentItem({ item })}
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={
            !subsLoading && !contentsLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : null
          }
        />
      ) : (
        /* Categories Grid */
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCategoryCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No categories yet</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    flex: 0.7,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    fontSize: 14,
    color: '#000',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  itemLink: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  categoryCard: {
    margin: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryDesc: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});
