import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { authStore } from '../src/store/auth';
import { PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const isLoading = authStore((state) => state.isLoading);

  useEffect(() => {
    authStore.getState().checkAuth();
  }, []);

  if (isLoading) {
    return <Stack />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <PaperProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
