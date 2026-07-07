import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { Button, Card, Text, ActivityIndicator } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { MaterialCommunityIcons } from '@expo/vector-symbols';
import { contentStore, Content } from '../../../src/store/content';
import { useFocusEffect } from '@react-navigation/native';

export default function MediaScreen() {
  const content = contentStore((state) => state.content);
  const isLoading = contentStore((state) => state.isLoading);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      requestMediaLibraryPermission();
      loadContent();
    }, [])
  );

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermission(status === 'granted');
    } catch (error) {
      console.error('Failed to request media library permission:', error);
    }
  };

  const loadContent = async () => {
    try {
      await contentStore.getState().fetchContent();
    } catch (error) {
      console.error('Failed to load content:', error);
    }
  };

  const downloadFile = async (url: string, fileName: string) => {
    if (Platform.OS === 'web') {
      // On web, open in new tab
      window.open(url, '_blank');
      return;
    }

    setDownloading(url);
    try {
      // Request permission if needed
      if (!mediaLibraryPermission) {
        await requestMediaLibraryPermission();
      }

      // Download file
      const downloadPath = `${FileSystem.DocumentDirectory}${fileName}`;
      const downloadResult = await FileSystem.downloadAsync(url, downloadPath);

      if (downloadResult.status === 200) {
        // Move to downloads folder
        if (mediaLibraryPermission) {
          try {
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            await MediaLibrary.createAlbumAsync('Downloads', asset, false);
            Alert.alert('Success', `Downloaded to Downloads folder`);
          } catch (error) {
            console.error('Failed to save to gallery:', error);
            Alert.alert('Success', `Downloaded to app documents`);
          }
        } else {
          Alert.alert('Downloaded', `File saved: ${downloadPath}`);
        }
      } else {
        Alert.alert('Error', 'Failed to download file');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const renderMedia = (item: Content) => {
    if (!item.images?.length && !item.videos?.length) return null;

    const media = [...(item.images || []), ...(item.videos || [])];
    return media.map((url, index) => {
      const fileName = url.split('/').pop() || `media-${Date.now()}`;
      const isVideo = item.videos?.includes(url);

      return (
        <Card key={`${item.id}-${index}`} style={styles.mediaCard}>
          <Card.Content style={styles.mediaContent}>
            <View style={styles.mediaInfo}>
              <MaterialCommunityIcons
                name={isVideo ? 'video' : 'image'}
                size={24}
                color="#2196F3"
              />
              <Text variant="bodySmall" style={styles.fileName}>
                {fileName}
              </Text>
            </View>
            <Button
              mode="contained-tonal"
              size="small"
              onPress={() => downloadFile(url, fileName)}
              disabled={downloading === url}
              loading={downloading === url}
            >
              {downloading === url ? 'Downloading...' : 'Download'}
            </Button>
          </Card.Content>
        </Card>
      );
    });
  };

  const renderContent = ({ item }: { item: Content }) => (
    <View style={styles.contentSection}>
      <Card>
        <Card.Content>
          <Text variant="titleMedium">{item.title}</Text>
          {item.description && (
            <Text variant="bodySmall" style={{ marginTop: 4 }}>
              {item.description}
            </Text>
          )}
        </Card.Content>
      </Card>
      <View style={styles.mediaList}>
        {renderMedia(item)}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator animating size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={content.filter((c) => c.images?.length || c.videos?.length)}
        keyExtractor={(item) => item.id}
        renderItem={renderContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="image-off" size={48} color="#ccc" />
            <Text variant="bodyMedium">No media files yet</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  contentSection: {
    marginBottom: 16,
  },
  mediaList: {
    marginTop: 12,
  },
  mediaCard: {
    marginBottom: 8,
  },
  mediaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  fileName: {
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
});
