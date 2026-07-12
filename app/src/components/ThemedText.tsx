import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemedTextProps extends TextProps {
  variant?: 'title' | 'subtitle' | 'body' | 'small' | 'label';
  muted?: boolean;
}

export const ThemedText: React.FC<ThemedTextProps> = ({ 
  variant = 'body', 
  muted = false,
  style,
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const variantStyles: Record<string, TextStyle> = {
    title: { fontSize: 32, fontWeight: 'bold' },
    subtitle: { fontSize: 16, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '400' },
    small: { fontSize: 12, fontWeight: '400' },
    label: { fontSize: 13, fontWeight: '500' },
  };

  const color = muted 
    ? (isDark ? '#888' : '#999')
    : (isDark ? '#fff' : '#000');

  return (
    <Text
      {...props}
      style={[
        variantStyles[variant],
        { color },
        style,
      ]}
    />
  );
};
