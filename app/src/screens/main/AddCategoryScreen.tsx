import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function AddCategoryScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success('Category created!');
      navigation.goBack();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    createCategory.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Category Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter category name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            editable={!createCategory.isPending}
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Enter category description"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            editable={!createCategory.isPending}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, createCategory.isPending && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={createCategory.isPending}
        >
          {createCategory.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Create Category</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.tipText}>
            You can add subcategories and content items after creating the category
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textarea: {
    height: 100,
    paddingTop: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tip: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
    alignItems: 'flex-start',
  },
  tipText: {
    marginLeft: 12,
    fontSize: 13,
    color: '#0d47a1',
    flex: 1,
  },
});
