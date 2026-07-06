import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Button,
} from 'react-native-paper';
import { contentStore } from '../store/content';
import { authStore } from '../store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export function DoneScreen() {
  const {
    contentItems,
    fetchContentByStatus,
    updateContent,
    deleteContent,
    isLoading,
  } = contentStore();
  const { theme } = authStore();

  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchContentByStatus('done');
    }, [])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContentByStatus('done');
    setRefreshing(false);
  }, []);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(id);
          try {
            await deleteContent(id);
            Alert.alert('Success', 'Item deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete item');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  }, []);

  const memoizedItems = useMemo(() => contentItems, [contentItems]);

  const renderContentCard = useCallback(({ item }: any) => (
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
            loading={deleting === item.id}
            disabled={deleting !== null}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  ), [deleting]);

  const backgroundColor = theme === 'dark' ? '#121212' : '#ffffff';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content 
          title="Done"
          subtitle={`${memoizedItems.length} items`}
        />
      </Appbar.Header>

      {isLoading && memoizedItems.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={memoizedItems}
          renderItem={renderContentCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ color: textColor }}>No done items</Text>
              <Text variant="bodyMedium" style={[styles.emptyStateHint, { color: textColor }]}>
                Mark items as done to see them here
              </Text>
            </View>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          scrollEventThrottle={16}
        />
      )}
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
