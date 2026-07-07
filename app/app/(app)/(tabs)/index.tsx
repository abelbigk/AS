import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { FAB, Card, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { contentStore, Category } from '../../../src/store/content';

export default function HomeScreen() {
  const categories = contentStore((state) => state.categories);
  const isLoading = contentStore((state) => state.isLoading);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    try {
      await contentStore.getState().fetchCategories();
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await contentStore.getState().deleteCategory(id);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{item.name}</Text>
        {item.description && (
          <Text variant="bodySmall" style={{ marginTop: 4 }}>
            {item.description}
          </Text>
        )}
      </Card.Content>
      <Card.Actions>
        <Button
          onPress={() => handleDeleteCategory(item.id)}
          textColor="#d32f2f"
        >
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium">No categories yet</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          // Navigate to create category screen
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
});
