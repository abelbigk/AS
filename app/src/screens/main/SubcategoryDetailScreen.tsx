import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function SubcategoryDetailScreen({ route, navigation }: any) {
  const { subcategoryId } = route.params;
  const { data: subcategory, isLoading, refetch } = trpc.subcategories.getById.useQuery({ subcategoryId });
  const { data: contentItems = [], refetch: refetchContent } = trpc.content.listBySubcategory.useQuery(
    { subcategoryId },
    { enabled: !!subcategoryId }
  );

  const [refreshing, setRefreshing] = useState(false);

  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      toast.success('Subcategory deleted');
      navigation.goBack();
    },
    onError: (error) => toast.error(error.message || 'Failed to delete subcategory'),
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchContent()]);
    setRefreshing(false);
  }, [refetch, refetchContent]);

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );

  const handleDeleteSubcategory = () => {
    Alert.alert(
      'Delete Subcategory?',
      `Are you sure you want to delete "${subcategory?.name}"?`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => deleteSubcategory.mutate({ subcategoryId }),
          style: 'destructive',
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{subcategory?.name}</Text>
              {subcategory?.description && (
                <Text style={styles.description}>{subcategory.description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteSubcategory}
              disabled={deleteSubcategory.isPending}
            >
              <Ionicons name="trash-outline" size={20} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        }
        data={contentItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemCard}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.heading}</Text>
              {item.description && (
                <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No content items yet</Text>
            </View>
          )
        }
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
