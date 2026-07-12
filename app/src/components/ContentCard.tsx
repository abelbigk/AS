import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { trpc } from '@/lib/trpc';

interface ContentCardProps {
  item: any;
  onPress?: () => void;
  isSelectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onPress,
  isSelectMode,
  selected,
  onToggleSelect,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const updateStatus = trpc.content.updateStatus.useMutation();

  const handleStatusToggle = (status: 'queued' | 'done') => {
    updateStatus.mutate({
      itemId: item.id,
      status: item.status === status ? 'default' : status,
    });
  };

  const bgColor = isDark ? '#2a2a2a' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const mutedColor = isDark ? '#888' : '#999';

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: bgColor }]}
      onPress={isSelectMode ? onToggleSelect : onPress}
      activeOpacity={0.7}
    >
      {isSelectMode && (
        <View style={styles.checkbox}>
          <Ionicons 
            name={selected ? "checkbox" : "checkbox-outline"} 
            size={24} 
            color={selected ? "#007AFF" : mutedColor}
          />
        </View>
      )}

      {item.media?.[0]?.url && (
        <Image 
          source={{ uri: item.media[0].url }}
          style={styles.thumbnail}
        />
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
          {item.heading}
        </Text>
        {item.description && (
          <Text style={[styles.description, { color: mutedColor }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.link && (
          <Text style={[styles.link, { color: '#007AFF' }]} numberOfLines={1}>
            {item.link}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => handleStatusToggle('queued')}
          style={[styles.actionBtn, item.status === 'queued' && styles.actionBtnActive]}
        >
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={item.status === 'queued' ? '#FFA500' : mutedColor}
          />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleStatusToggle('done')}
          style={[styles.actionBtn, item.status === 'done' && styles.actionBtnActive]}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={16} 
            color={item.status === 'done' ? '#4caf50' : mutedColor}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    marginBottom: 4,
  },
  link: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 6,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
  },
});
