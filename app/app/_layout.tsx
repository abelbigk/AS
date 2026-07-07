import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const { checkAuth, isLoggedIn } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="(auth)" options={{ animationEnabled: false }} />
      ) : (
        <Stack.Screen name="(app)" options={{ animationEnabled: false }} />
      )}
    </Stack>
  );
}
