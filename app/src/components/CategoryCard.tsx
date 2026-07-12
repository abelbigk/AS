import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface CategoryCardProps {
  category: any; // Category type
  onPress?: () => void;
  contentCount?: number;
}

const CATEGORY_IMAGES: Record<string, string> = {
  "Movies": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
  "Food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  "Place": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80",
  "Must": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=400&q=80",
  "Quotes": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80",
  "Business and money management": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80",
  "How to": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80",
  "Health": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
  "Workout": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80",
  "Her": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80",
  "Games": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
  "Home and Designs": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
  "Tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80";

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  onPress,
  contentCount = 0 
}) => {
  const { theme } = useTheme();
  const imageUrl = category.coverImageUrl || CATEGORY_IMAGES[category.name] || FALLBACK_IMAGE;

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: imageUrl }}
        style={styles.image}
      />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{category.name}</Text>
        {contentCount > 0 && (
          <Text style={styles.count}>
            {contentCount} item{contentCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#fff" style={styles.arrow} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  count: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  arrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
  },
});
