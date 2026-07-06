import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  TextInput as RNTextInput,
} from 'react-native';
import { Appbar, Button, Card, Text, FAB, Dialog, Portal } from 'react-native-paper';
import { contentStore } from '../store/content';
import { authStore } from '../store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export function HomeScreen({ navigation }: any) {
  const { categories, fetchCategories, createCategory, isLoading } = contentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { user } = authStore();

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await createCategory({
        name: newCategoryName,
        description: '',
      });
      setNewCategoryName('');
      setDialogVisible(false);
      Alert.alert('Success', 'Category created');
    } catch (error) {
      Alert.alert('Error', 'Failed to create category');
    }
  };

  const renderCategoryCard = ({ item }: any) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('CategoryDetail', { categoryId: item.id })}
    >
      <Card.Content>
        <Text variant="titleLarge" style={styles.categoryName}>
          {item.name}
        </Text>
        {item.description && (
          <Text variant="bodyMedium" style={styles.description}>
            {item.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Categories" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
        />
      </Appbar.Header>

      <FlatList
        data={categories}
        renderItem={renderCategoryCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="bodyLarge">No categories yet</Text>
            <Text variant="bodyMedium" style={styles.emptyStateHint}>
              Create one to get started
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label="New Category"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create New Category</Dialog.Title>
          <Dialog.Content>
            <RNTextInput
              placeholder="Category name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateCategory}>Create</Button>
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
  listContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    marginHorizontal: 0,
  },
  categoryName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: '#666',
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
    marginVertical: 12,
    fontFamily: 'System',
  },
});
