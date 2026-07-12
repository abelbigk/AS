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
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';

export default function CategoryDetailScreen({ route, navigation }: any) {
  const { categoryId } = route.params;
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: category, isLoading, refetch } = trpc.categories.getById.useQuery({ categoryId });
  const { data: subcategories = [], refetch: refetchSubs } = trpc.subcategories.list.useQuery(
    { categoryId },
    { enabled: !!categoryId }
  );
  const { data: contentItems = [], refetch: refetchContent } = trpc.content.listByCategory.useQuery(
    { categoryId },
    { enabled: !!categoryId }
  );

  const [refreshing, setRefreshing] = useState(false);
  const [showEditCat, setShowEditCat] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showEditSub, setShowEditSub] = useState(false);
  const [showEditContent, setShowEditContent] = useState(false);
  const [editCatName, setEditCatName] = useState(category?.name || '');
  const [editCatDesc, setEditCatDesc] = useState(category?.description || '');
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [contentHeading, setContentHeading] = useState('');
  const [contentDesc, setContentDesc] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);

  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast.success('Category updated');
      refetch();
      setShowEditCat(false);
    },
    onError: (e) => toast.error(e.message || 'Failed to update'),
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success('Category deleted');
      navigation.goBack();
    },
    onError: (error) => toast.error(error.message || 'Failed to delete category'),
  });

  const createSubcategory = trpc.subcategories.create.useMutation({
    onSuccess: () => {
      toast.success('Subcategory created');
      refetchSubs();
      setShowAddSub(false);
      setSubName('');
      setSubDesc('');
    },
    onError: (e) => toast.error(e.message || 'Failed to create'),
  });

  const createContent = trpc.content.create.useMutation({
    onSuccess: () => {
      toast.success('Content added');
      refetchContent();
      setShowAddContent(false);
      setContentHeading('');
      setContentDesc('');
    },
    onError: (e) => toast.error(e.message || 'Failed to create'),
  });

  const updateContentStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated');
      refetchContent();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteContent = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success('Content deleted');
      refetchContent();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateSubcategory = trpc.subcategories.update.useMutation({
    onSuccess: () => {
      toast.success('Subcategory updated');
      refetchSubs();
      setShowEditSub(false);
      setEditingSubcategory(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to update'),
  });

  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      toast.success('Subcategory deleted');
      refetchSubs();
    },
    onError: (e) => toast.error(e.message || 'Failed to delete'),
  });

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      toast.success('Content updated');
      refetchContent();
      setShowEditContent(false);
      setEditingContent(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to update'),
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchSubs(), refetchContent()]);
    setRefreshing(false);
  }, [refetch, refetchSubs, refetchContent]);

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );

  const handleUpdateCategory = () => {
    if (!editCatName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    updateCategory.mutate({
      categoryId,
      name: editCatName.trim(),
      description: editCatDesc.trim() || undefined,
    });
  };

  const handleAddSubcategory = () => {
    if (!subName.trim()) {
      Alert.alert('Error', 'Subcategory name is required');
      return;
    }
    createSubcategory.mutate({
      categoryId,
      name: subName.trim(),
      description: subDesc.trim() || undefined,
    });
  };

  const handleAddContent = () => {
    if (!contentHeading.trim()) {
      Alert.alert('Error', 'Content title is required');
      return;
    }
    createContent.mutate({
      categoryIds: [categoryId],
      heading: contentHeading.trim(),
      description: contentDesc.trim() || undefined,
    });
  };

  const handleToggleStatus = (item: any) => {
    const newStatus = item.status === 'queued' ? 'done' : 'queued';
    updateContentStatus.mutate({
      itemId: item.id,
      status: newStatus,
    });
  };

  const handleDeleteContent = (itemId: number) => {
    Alert.alert('Delete', 'Remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: () => deleteContent.mutate({ itemId }),
        style: 'destructive',
      },
    ]);
  };

  const handleEditSubcategory = (sub: any) => {
    setEditingSubcategory(sub);
    setSubName(sub.name);
    setSubDesc(sub.description || '');
    setShowEditSub(true);
  };

  const handleUpdateSubcategory = () => {
    if (!subName.trim()) {
      Alert.alert('Error', 'Subcategory name is required');
      return;
    }
    updateSubcategory.mutate({
      subcategoryId: editingSubcategory.id,
      name: subName.trim(),
      description: subDesc.trim() || undefined,
    });
  };

  const handleDeleteSubcategory = (subcategoryId: number) => {
    Alert.alert('Delete', 'Remove this subcategory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: () => deleteSubcategory.mutate({ subcategoryId }),
        style: 'destructive',
      },
    ]);
  };

  const handleEditContent = (item: any) => {
    setEditingContent(item);
    setContentHeading(item.heading);
    setContentDesc(item.description || '');
    setShowEditContent(true);
  };

  const handleUpdateContent = () => {
    if (!contentHeading.trim()) {
      Alert.alert('Error', 'Content title is required');
      return;
    }
    updateContent.mutate({
      itemId: editingContent.id,
      categoryIds: editingContent.categoryIds,
      heading: contentHeading.trim(),
      description: contentDesc.trim() || undefined,
    });
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
              <Text style={styles.title}>{category?.name}</Text>
              {category?.description && (
                <Text style={styles.description}>{category.description}</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setEditCatName(category?.name || '');
                  setEditCatDesc(category?.description || '');
                  setShowEditCat(true);
                }}
              >
                <Ionicons name="pencil-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { marginLeft: 8 }]}
                onPress={() =>
                  Alert.alert('Delete?', `Delete "${category?.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => deleteCategory.mutate({ categoryId }),
                      style: 'destructive',
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          </View>
        }
        data={[
          ...subcategories.map((s: any) => ({ ...s, _type: 'subcategory' })),
          ...contentItems.map((c: any) => ({ ...c, _type: 'content' })),
        ]}
        keyExtractor={(item, index) => `${index}-${item.id}`}
        renderItem={({ item }: any) => {
          if (item._type === 'subcategory') {
            return (
              <View style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.itemContent}
                  onPress={() =>
                    navigation.navigate('subcategory-detail', { subcategoryId: item.id })
                  }
                >
                  <Ionicons name="layers" size={20} color="#007AFF" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEditSubcategory(item)}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="pencil-outline" size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteSubcategory(item.id)}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <View style={styles.itemCard}>
              <TouchableOpacity
                style={styles.itemContent}
                onPress={() => handleToggleStatus(item)}
              >
                <Ionicons
                  name={item.status === 'done' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={20}
                  color={item.status === 'done' ? '#4caf50' : '#999'}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={[
                      styles.itemTitle,
                      item.status === 'done' && styles.doneItem,
                    ]}
                  >
                    {item.heading}
                  </Text>
                  {item.link && (
                    <Text style={styles.itemLink} numberOfLines={1}>
                      {item.link}
                    </Text>
                  )}
                  {item.description && (
                    <Text style={styles.itemDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleEditContent(item)}
                style={{ padding: 8 }}
              >
                <Ionicons name="pencil-outline" size={18} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteContent(item.id)}
                style={{ padding: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No subcategories or content yet</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddContent(true)}
              >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Add Content</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Edit Category Modal */}
      <Modal visible={showEditCat} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Category</Text>
              <TouchableOpacity onPress={() => setShowEditCat(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editCatName}
                onChangeText={setEditCatName}
                placeholder="Category name"
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={editCatDesc}
                onChangeText={setEditCatDesc}
                placeholder="Description"
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleUpdateCategory}
                disabled={updateCategory.isPending}
              >
                {updateCategory.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal visible={showAddSub} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Subcategory</Text>
              <TouchableOpacity onPress={() => setShowAddSub(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={subName}
                onChangeText={setSubName}
                placeholder="Subcategory name"
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={subDesc}
                onChangeText={setSubDesc}
                placeholder="Description"
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddSubcategory}
                disabled={createSubcategory.isPending}
              >
                {createSubcategory.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Subcategory</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Content Modal */}
      <Modal visible={showAddContent} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Content Item</Text>
              <TouchableOpacity onPress={() => setShowAddContent(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={contentHeading}
                onChangeText={setContentHeading}
                placeholder="Item title"
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={contentDesc}
                onChangeText={setContentDesc}
                placeholder="Description"
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddContent}
                disabled={createContent.isPending}
              >
                {createContent.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Content</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Subcategory Modal */}
      <Modal visible={showEditSub} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Subcategory</Text>
              <TouchableOpacity onPress={() => setShowEditSub(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={subName}
                onChangeText={setSubName}
                placeholder="Subcategory name"
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={subDesc}
                onChangeText={setSubDesc}
                placeholder="Description"
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleUpdateSubcategory}
                disabled={updateSubcategory.isPending}
              >
                {updateSubcategory.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Content Modal */}
      <Modal visible={showEditContent} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Content Item</Text>
              <TouchableOpacity onPress={() => setShowEditContent(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={contentHeading}
                onChangeText={setContentHeading}
                placeholder="Item title"
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={contentDesc}
                onChangeText={setContentDesc}
                placeholder="Description"
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleUpdateContent}
                disabled={updateContent.isPending}
              >
                {updateContent.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  actionBtn: {
    padding: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  doneItem: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  itemLink: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  itemDesc: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
