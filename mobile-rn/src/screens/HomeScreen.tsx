import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TextInput as RNTextInput,
  ActivityIndicator,
} from 'react-native';
import { Appbar, Button, Card, Text, FAB, Dialog, Portal } from 'react-native-paper';
import { contentStore } from '../store/content';
import { authStore } from '../store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export function HomeScreen({ navigation }: any) {
  const { categories, fetchCategories, createCategory, isLoading } = contentStore();
  const { user, theme } = authStore();
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  }, []);

  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsCreating(true);
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
    } finally {
      setIsCreating(false);
    }
  }, [newCategoryName]);

  const renderCategoryCard = useCallback(({ item }: any) => (
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
  ), []);

  const memoizedCategories = useMemo(() => categories, [categories]);

  const backgroundColor = theme === 'dark' ? '#121212' : '#ffffff';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Categories" subtitle={user?.username ? `Hi, ${user.username}` : ''} />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
        />
      </Appbar.Header>

      {isLoading && categories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={memoizedCategories}
          renderItem={renderCategoryCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ color: textColor }}>No categories yet</Text>
              <Text variant="bodyMedium" style={[styles.emptyStateHint, { color: textColor }]}>
                Create one to get started
              </Text>
            </View>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          scrollEventThrottle={16}
          initialNumToRender={10}
        />
      )}

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
              placeholderTextColor="#999"
              editable={!isCreating}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={isCreating}>Cancel</Button>
            <Button onPress={handleCreateCategory} disabled={isCreating} loading={isCreating}>
              Create
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#000',
  },
});
