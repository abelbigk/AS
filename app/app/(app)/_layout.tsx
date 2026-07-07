import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';

export default function AppLayout() {
  const { logout } = useAuthStore();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      // Optional: add cleanup logic
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#2196F3',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="media" options={{ title: 'Media' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
