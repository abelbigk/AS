import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContentStore } from '../../src/store/content';

interface ContentWithMedia {
  id: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export default function MediaScreen() {
  const { content, fetchContent, loading } = useContentStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        await fetchContent();
      } catch (error) {
        Alert.alert('Error', 'Failed to load media');
      }
    };
    loadContent();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchContent();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleDownload = useCallback((mediaUrl?: string, mediaType?: string, title?: string) => {
    if (!mediaUrl) {
      Alert.alert('Error', 'No media URL available');
      return;
    }

    // On mobile, we can use Linking to download
    // On web, this will trigger browser download
    Linking.openURL(mediaUrl).catch(() => {
      Alert.alert('Error', 'Failed to download media');
    });
  }, []);

  const renderMediaItem = ({ item }: any) => {
    return (
      <View style={styles.mediaCard}>
        <View style={styles.mediaContent}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.mediaInfo}>
            {item.mediaType && (
              <Text style={styles.badge}>{item.mediaType.toUpperCase()}</Text>
            )}
          </View>
        </View>

        {item.mediaUrl && (
          <>
            {item.mediaType === 'image' && (
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.thumbnail}
                onError={() => console.log('Image load error')}
              />
            )}

            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleDownload(item.mediaUrl, item.mediaType, item.title)}
            >
              <Text style={styles.downloadButtonText}>Download</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const mediaWithContent = content.filter((c) => c.mediaUrl);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={mediaWithContent}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No media yet</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  mediaCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  mediaContent: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  mediaInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: '#e3f2fd',
    color: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  downloadButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});
