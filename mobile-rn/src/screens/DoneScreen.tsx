import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Button,
} from 'react-native-paper';
import { contentStore } from '../store/content';
import { SafeAreaView } from 'react-native-safe-area-context';

export function DoneScreen() {
  const {
    contentItems,
    fetchContentByStatus,
    updateContent,
    deleteContent,
    isLoading,
  } = contentStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchContentByStatus('done');
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContentByStatus('done');
    setRefreshing(false);
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteContent(id);
            Alert.alert('Success', 'Item deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const renderContentCard = ({ item }: any) => (
    <Card style={styles.card}>
      <Card.Content>
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
        <View style={styles.actions}>
          <Button
            mode="outlined"
            size="small"
            onPress={() => handleDelete(item.id)}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content 
          title={`Done (${contentItems.length})`}
        />
      </Appbar.Header>

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
            <Text variant="bodyLarge">No done items</Text>
            <Text variant="bodyMedium" style={styles.emptyStateHint}>
              Mark items as done to see them here
            </Text>
          </View>
        }
      />
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
  heading: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: '#666',
    marginVertical: 4,
  },
  actions: {
    marginTop: 12,
    gap: 8,
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
});
