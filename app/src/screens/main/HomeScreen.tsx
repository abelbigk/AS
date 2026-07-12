import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/lib/trpc';
import { useTheme } from '@/contexts/ThemeContext';
import { CategoryCard } from '@/components/CategoryCard';

export default function HomeScreen({ navigation }: any) {
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: categories = [], isLoading, refetch } = trpc.categories.list.useQuery();
  const { data: searchResults = [], isLoading: searchLoading } = trpc.content.search.useQuery(
    { query: searchQuery },
    { enabled: searchActive && searchQuery.length > 0 }
  );

  const filteredCategories = searchActive
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading && !searchActive) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: isDark ? '#2a2a2a' : '#fff', borderBottomColor: isDark ? '#333' : '#e0e0e0' }]}>
        {searchActive && (
          <TouchableOpacity
            onPress={() => {
              setSearchActive(false);
              setSearchQuery('');
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        
        <View style={[
          styles.searchInputWrapper,
          { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0', borderColor: isDark ? '#333' : '#e0e0e0' }
        ]}>
          <Ionicons name="search" size={18} color={isDark ? '#888' : '#999'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#fff' : '#000' }]}
            placeholder="Search..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchActive(true)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={18} color={isDark ? '#888' : '#999'} />
            </TouchableOpacity>
          )}
        </View>

        {!searchActive && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('add-category')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={28} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {searchActive && searchQuery.trim().length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color={isDark ? '#444' : '#ccc'} />
          <Text style={[styles.emptyText, { color: isDark ? '#888' : '#999' }]}>
            Search for everything
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchActive ? filteredCategories : categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <CategoryCard
                category={item}
                contentCount={0}
                onPress={() =>
                  navigation.navigate('category-detail', { categoryId: item.id })
                }
              />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor="#007AFF"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open" size={48} color={isDark ? '#444' : '#ccc'} />
              <Text style={[styles.emptyText, { color: isDark ? '#888' : '#999' }]}>
                {searchActive ? 'No categories match' : 'No categories yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 14,
  },
  addButton: {
    marginLeft: 12,
    padding: 4,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});
