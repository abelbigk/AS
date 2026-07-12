import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/lib/trpc';
import { useTheme } from '@/contexts/ThemeContext';

export default function QueuedScreen({ navigation }: any) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: items = [], isLoading, refetch } = trpc.content.listByStatus.useQuery('queued');
  const { data: categories = [], isLoading: catsLoading } = trpc.categories.list.useQuery();
  const { data: allSubcategories = [], isLoading: subsLoading } = trpc.subcategories.list.useQuery({ categoryId: 0 });

  const [refreshing, setRefreshing] = useState(false);

  const groupedData = useMemo(() => {
    if (!items || !categories) return [];

    const catMap = new Map<number, { category: any; items: any[]; count: number }>();

    items.forEach((item) => {
      const relevantCatIds = new Set<number>(item.categoryIds);

      const itemSubcategories = item.subcategoryIds
        .map((subId) => allSubcategories.find((s) => s.id === subId))
        .filter(Boolean);

      itemSubcategories.forEach((sub) => {
        if (sub) relevantCatIds.add(sub.categoryId);
      });

      relevantCatIds.forEach((catId) => {
        if (!catMap.has(catId)) {
          const cat = categories.find((c) => c.id === catId);
          if (cat) {
            catMap.set(catId, { category: cat, items: [], count: 0 });
          }
        }
        const group = catMap.get(catId);
        if (group) {
          group.items.push(item);
          group.count++;
        }
      });
    });

    return Array.from(catMap.values()).sort((a, b) => b.count - a.count);
  }, [items, categories, allSubcategories]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );

  const renderGroupHeader = ({ section }: any) => (
    <TouchableOpacity
      style={styles.groupHeader}
      onPress={() =>
        navigation.navigate('category-detail', { categoryId: section.category.id })
      }
    >
      <View style={styles.groupTitleSection}>
        <Text style={styles.groupTitle}>{section.category.name}</Text>
        <Text style={styles.itemCount}>{section.count} items</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#007AFF" />
    </TouchableOpacity>
  );

  if (isLoading || catsLoading || subsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={groupedData.map((group) => ({
          title: group.category.name,
          data: group.items,
          category: group.category,
          count: group.count,
        }))}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.heading}</Text>
              {item.link && <Text style={styles.itemLink} numberOfLines={1}>{item.link}</Text>}
            </View>
            <Ionicons name="checkmark-circle-outline" size={24} color="#4caf50" />
          </View>
        )}
        renderSectionHeader={({ section }) => renderGroupHeader({ section })}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No queued items</Text>
            </View>
          )
        }
      />
    </View>
  );
}

import { SectionList } from 'react-native';

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
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupTitleSection: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  itemCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  itemLink: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
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
