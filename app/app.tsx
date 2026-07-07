import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { authStore } from './src/store/auth';

export default function RootLayout() {
  useEffect(() => {
    authStore.getState().checkAuth();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
