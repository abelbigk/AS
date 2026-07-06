import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Text, Dialog, Portal, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

interface ImageUploadPickerProps {
  onImageSelected: (uri: string) => void;
  selectedImageUri?: string;
}

export function ImageUploadPicker({ onImageSelected, selectedImageUri }: ImageUploadPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      setIsLoading(true);

      let result;
      if (source === 'library') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'You need to allow access to your photo library');
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'You need to allow access to your camera');
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        setDialogVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.label}>
        Poster Image
      </Text>

      {selectedImageUri ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: selectedImageUri }} style={styles.image} />
          <IconButton
            icon="close"
            size={24}
            style={styles.removeButton}
            onPress={() => onImageSelected('')}
          />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text variant="bodyMedium" style={styles.placeholderText}>
            No image selected
          </Text>
        </View>
      )}

      <Button
        mode="contained-tonal"
        style={styles.button}
        onPress={() => setDialogVisible(true)}
      >
        {selectedImageUri ? 'Change Image' : 'Upload Image'}
      </Button>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Select Image Source</Dialog.Title>
          <Dialog.Content>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <View style={styles.options}>
                <Button
                  mode="contained"
                  style={styles.optionButton}
                  onPress={() => pickImage('camera')}
                >
                  Take Photo
                </Button>
                <Button
                  mode="contained"
                  style={styles.optionButton}
                  onPress={() => pickImage('library')}
                >
                  Choose from Library
                </Button>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  placeholder: {
    height: 180,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  placeholderText: {
    color: '#999',
  },
  button: {
    marginTop: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  options: {
    gap: 12,
  },
  optionButton: {
    marginVertical: 6,
  },
});
