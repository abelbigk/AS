import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContentStore } from '../../src/store/content';

interface CategoryWithSubcategories {
  id: string;
  name: string;
  description?: string;
  subcategoriesCount: number;
}

export default function HomeScreen() {
  const { categories, subcategories, fetchCategories, fetchSubcategories, addCategory, loading } =
    useContentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchCategories();
      } catch (error) {
        Alert.alert('Error', 'Failed to load categories');
      }
    };
    loadData();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCategories();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    try {
      await addCategory(newCategoryName, newCategoryDescription || undefined);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowAddModal(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create category');
    }
  }, [newCategoryName, newCategoryDescription]);

  const handleExpandCategory = useCallback(async (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      try {
        await fetchSubcategories(categoryId);
        setExpandedCategory(categoryId);
      } catch (error) {
        Alert.alert('Error', 'Failed to load subcategories');
      }
    }
  }, [expandedCategory, fetchSubcategories]);

  const expandedSubcategories = useMemo(() => {
    if (!expandedCategory) return [];
    return subcategories.filter((s) => s.categoryId === expandedCategory);
  }, [expandedCategory, subcategories]);

  const renderCategory = ({ item }: any) => {
    const isExpanded = expandedCategory === item.id;
    const subs = expandedSubcategories;

    return (
      <View key={item.id} style={styles.categoryContainer}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => handleExpandCategory(item.id)}
        >
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryName}>{item.name}</Text>
            {item.description && <Text style={styles.categoryDescription}>{item.description}</Text>}
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.subcategoriesContainer}>
            {subs.length === 0 ? (
              <Text style={styles.emptyText}>No subcategories</Text>
            ) : (
              subs.map((sub) => (
                <View key={sub.id} style={styles.subcategoryItem}>
                  <Text style={styles.subcategoryName}>{sub.name}</Text>
                  {sub.description && (
                    <Text style={styles.subcategoryDescription}>{sub.description}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No categories yet</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Category</Text>

            <TextInput
              style={styles.input}
              placeholder="Category name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              value={newCategoryDescription}
              onChangeText={setNewCategoryDescription}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                }}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={handleAddCategory}>
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  categoryContainer: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9f9f9',
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
  },
  subcategoriesContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subcategoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  subcategoryDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2196F3',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#000',
  },
  inputMultiline: {
    textAlignVertical: 'top',
    height: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});
