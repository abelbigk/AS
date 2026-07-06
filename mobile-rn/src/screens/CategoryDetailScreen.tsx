import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Text,
  FAB,
  Dialog,
  Portal,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import { TextInput as RNTextInput } from 'react-native';
import { contentStore } from '../store/content';
import { ImageUploadPicker } from '../components/ImageUploadPicker';
import { SafeAreaView } from 'react-native-safe-area-context';

export function CategoryDetailScreen({ route, navigation }: any) {
  const { categoryId } = route.params;
  const {
    categories,
    contentItems,
    subcategories,
    fetchContentByCategory,
    createContent,
    fetchSubcategories,
    isLoading,
  } = contentStore();

  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'content' | 'subcategories'>('content');
  const [newItemHeading, setNewItemHeading] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [uploading, setUploading] = useState(false);

  const category = categories.find((c) => c.id === categoryId);
  const categorySubcategories = useMemo(
    () => subcategories.filter((sub) => sub.categoryId === categoryId),
    [subcategories, categoryId]
  );

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    await Promise.all([
      fetchContentByCategory(categoryId),
      fetchSubcategories(categoryId),
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateContent = async () => {
    if (!newItemHeading.trim()) {
      Alert.alert('Error', 'Please enter a heading');
      return;
    }

    setUploading(true);
    try {
      await createContent({
        heading: newItemHeading,
        description: newItemDescription,
        posterUrl: selectedImage,
        status: 'default',
      });
      setNewItemHeading('');
      setNewItemDescription('');
      setSelectedImage('');
      setDialogVisible(false);
      Alert.alert('Success', 'Content added');
    } catch (error) {
      Alert.alert('Error', 'Failed to create content');
    } finally {
      setUploading(false);
    }
  };

  const renderContentCard = ({ item }: any) => (
    <Card
      style={styles.card}
      onPress={() =>
        navigation.navigate('ContentDetail', { contentId: item.id })
      }
    >
      <Card.Content>
        <View style={styles.cardContent}>
          {item.posterUrl && (
            <View style={styles.posterContainer}>
              {/* Placeholder for image display - would need proper image handling */}
              <View style={styles.posterPlaceholder} />
            </View>
          )}
          <View style={styles.textContent}>
            <View style={styles.statusChip}>
              <Chip
                size="small"
                label={item.status}
                mode="outlined"
              />
            </View>
            <Text variant="titleMedium" style={styles.heading}>
              {item.heading}
            </Text>
            {item.description && (
              <Text
                variant="bodySmall"
                style={styles.description}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderSubcategoryCard = ({ item }: any) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.heading}>
          {item.name}
        </Text>
        {item.description && (
          <Text
            variant="bodySmall"
            style={styles.description}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={category?.name || 'Category'} />
      </Appbar.Header>

      {category?.description && (
        <View style={styles.descriptionBanner}>
          <Text variant="bodyMedium">{category.description}</Text>
        </View>
      )}

      <SegmentedButtons
        value={viewMode}
        onValueChange={(value) => setViewMode(value as 'content' | 'subcategories')}
        buttons={[
          {
            value: 'content',
            label: 'Content',
            icon: 'file-document',
          },
          {
            value: 'subcategories',
            label: 'Subcategories',
            icon: 'folder-multiple',
          },
        ]}
        style={styles.segmentedButtons}
      />

      {isLoading && contentItems.length === 0 && viewMode === 'content' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={viewMode === 'content' ? contentItems : categorySubcategories}
          renderItem={viewMode === 'content' ? renderContentCard : renderSubcategoryCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">
                No {viewMode === 'content' ? 'content' : 'subcategories'} yet
              </Text>
              <Text variant="bodyMedium" style={styles.emptyStateHint}>
                Create one to get started
              </Text>
            </View>
          }
        />
      )}

      {viewMode === 'content' && (
        <FAB
          icon="plus"
          label="Add Content"
          style={styles.fab}
          onPress={() => setDialogVisible(true)}
        />
      )}

      {viewMode === 'subcategories' && (
        <FAB
          icon="plus"
          label="Add Subcategory"
          style={styles.fab}
          onPress={() => navigation.navigate('SubcategoryList', { 
            categoryId, 
            categoryName: category?.name 
          })}
        />
      )}

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Add Content</Dialog.Title>
          <Dialog.Content>
            <ScrollView showsVerticalScrollIndicator={false}>
              <RNTextInput
                placeholder="Heading"
                value={newItemHeading}
                onChangeText={setNewItemHeading}
                style={styles.input}
                placeholderTextColor="#ccc"
                editable={!uploading}
              />
              <RNTextInput
                placeholder="Description"
                value={newItemDescription}
                onChangeText={setNewItemDescription}
                style={[styles.input, styles.multilineInput]}
                placeholderTextColor="#ccc"
                multiline
                numberOfLines={4}
                editable={!uploading}
              />
              <ImageUploadPicker
                onImageSelected={setSelectedImage}
                selectedImageUri={selectedImage}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onPress={handleCreateContent} disabled={uploading} loading={uploading}>
              {uploading ? 'Uploading...' : 'Add'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  descriptionBanner: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  segmentedButtons: {
    margin: 12,
  },
  listContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 80,
  },
  card: {
    marginHorizontal: 0,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  posterContainer: {
    width: 80,
    height: 80,
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  textContent: {
    flex: 1,
  },
  statusChip: {
    marginBottom: 8,
  },
  heading: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateHint: {
    marginTop: 8,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
    fontFamily: 'System',
    color: '#000',
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
