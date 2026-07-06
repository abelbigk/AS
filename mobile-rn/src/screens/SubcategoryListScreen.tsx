import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TextInput as RNTextInput,
  ActivityIndicator,
} from 'react-native';
import { Appbar, Button, Card, Text, FAB, Dialog, Portal, Chip } from 'react-native-paper';
import { contentStore } from '../store/content';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SubcategoryListScreen({ route, navigation }: any) {
  const { categoryId, categoryName } = route.params;
  const { subcategories, fetchSubcategories, createSubcategory, deleteSubcategory, isLoading } = contentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryDesc, setNewSubcategoryDesc] = useState('');

  useEffect(() => {
    loadSubcategories();
  }, [categoryId]);

  const loadSubcategories = async () => {
    await fetchSubcategories(categoryId);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubcategories();
    setRefreshing(false);
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      Alert.alert('Error', 'Please enter a subcategory name');
      return;
    }

    try {
      await createSubcategory(categoryId, {
        name: newSubcategoryName,
        description: newSubcategoryDesc,
      });
      setNewSubcategoryName('');
      setNewSubcategoryDesc('');
      setDialogVisible(false);
      Alert.alert('Success', 'Subcategory created');
    } catch (error) {
      Alert.alert('Error', 'Failed to create subcategory');
    }
  };

  const handleDeleteSubcategory = (id: number, name: string) => {
    Alert.alert('Delete Subcategory', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteSubcategory(id);
            Alert.alert('Success', 'Subcategory deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete subcategory');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const filteredSubcategories = useMemo(() => {
    return subcategories.filter((sub) => sub.categoryId === categoryId);
  }, [subcategories, categoryId]);

  const renderSubcategoryCard = ({ item }: any) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text variant="titleMedium" style={styles.subcategoryName}>
              {item.name}
            </Text>
            {item.description && (
              <Text variant="bodySmall" style={styles.description}>
                {item.description}
              </Text>
            )}
          </View>
          <Button
            mode="text"
            compact
            textColor="red"
            onPress={() => handleDeleteSubcategory(item.id, item.name)}
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
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={categoryName} subtitle="Subcategories" />
      </Appbar.Header>

      {isLoading && filteredSubcategories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredSubcategories}
          renderItem={renderSubcategoryCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">No subcategories yet</Text>
              <Text variant="bodyMedium" style={styles.emptyStateHint}>
                Create one to organize content
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        label="New Subcategory"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create New Subcategory</Dialog.Title>
          <Dialog.Content>
            <RNTextInput
              placeholder="Subcategory name"
              value={newSubcategoryName}
              onChangeText={setNewSubcategoryName}
              style={styles.input}
              placeholderTextColor="#999"
            />
            <RNTextInput
              placeholder="Description (optional)"
              value={newSubcategoryDesc}
              onChangeText={setNewSubcategoryDesc}
              style={styles.input}
              placeholderTextColor="#999"
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateSubcategory}>Create</Button>
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
    paddingBottom: 80,
  },
  card: {
    marginHorizontal: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
  },
  subcategoryName: {
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
    marginVertical: 8,
    fontFamily: 'System',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
