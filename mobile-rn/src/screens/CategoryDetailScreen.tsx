import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
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
} from 'react-native-paper';
import { TextInput as RNTextInput } from 'react-native';
import { contentStore } from '../store/content';
import { SafeAreaView } from 'react-native-safe-area-context';

export function CategoryDetailScreen({ route, navigation }: any) {
  const { categoryId } = route.params;
  const {
    categories,
    contentItems,
    fetchContentByCategory,
    createContent,
    updateContent,
    isLoading,
  } = contentStore();

  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newItemHeading, setNewItemHeading] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  const category = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    fetchContentByCategory(categoryId);
  }, [categoryId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContentByCategory(categoryId);
    setRefreshing(false);
  };

  const handleCreateContent = async () => {
    if (!newItemHeading.trim()) {
      Alert.alert('Error', 'Please enter a heading');
      return;
    }

    try {
      await createContent({
        heading: newItemHeading,
        description: newItemDescription,
        status: 'default',
      });
      setNewItemHeading('');
      setNewItemDescription('');
      setDialogVisible(false);
      Alert.alert('Success', 'Content added');
    } catch (error) {
      Alert.alert('Error', 'Failed to create content');
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

      <FlatList
        data={contentItems}
        renderItem={renderContentCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="bodyLarge">No content yet</Text>
            <Text variant="bodyMedium" style={styles.emptyStateHint}>
              Add content to this category
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label="Add Content"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Add Content</Dialog.Title>
          <Dialog.Content>
            <RNTextInput
              placeholder="Heading"
              value={newItemHeading}
              onChangeText={setNewItemHeading}
              style={styles.input}
              placeholderTextColor="#ccc"
            />
            <RNTextInput
              placeholder="Description"
              value={newItemDescription}
              onChangeText={setNewItemDescription}
              style={[styles.input, styles.multilineInput]}
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateContent}>Add</Button>
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
  listContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    marginHorizontal: 0,
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
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
});
