import React, { useEffect } from 'react';
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
        <Stack.Screen name="(auth)" />
      ) : (
        <Stack.Screen name="(app)" />
      )}
    </Stack>
  );
}
