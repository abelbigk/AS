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
  Chip,
  Button,
} from 'react-native-paper';
import { contentStore } from '../store/content';
import { SafeAreaView } from 'react-native-safe-area-context';

export function QueuedScreen() {
  const {
    contentItems,
    fetchContentByStatus,
    updateContent,
    isLoading,
  } = contentStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchContentByStatus('queued');
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContentByStatus('queued');
    setRefreshing(false);
  };

  const handleMarkDone = async (id: number) => {
    try {
      await updateContent(id, { status: 'done' });
      Alert.alert('Success', 'Marked as done');
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
    }
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
            mode="contained-tonal"
            size="small"
            onPress={() => handleMarkDone(item.id)}
          >
            Mark Done
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content 
          title={`Queued (${contentItems.length})`}
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
            <Text variant="bodyLarge">No queued items</Text>
            <Text variant="bodyMedium" style={styles.emptyStateHint}>
              Add items to work on them
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
