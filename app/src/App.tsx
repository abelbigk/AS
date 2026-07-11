import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import RootNavigator from '@/navigation/RootNavigator';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Constants from 'expo-constants';

import superjson from 'superjson';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Use local backend during development to avoid CORS issues when running the web dev server
const defaultProdApi = 'https://as-wryo.onrender.com';
const apiUrl = (process.env.NODE_ENV === 'development')
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000')
  : (Constants.expoConfig?.extra?.apiUrl || defaultProdApi);

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiUrl}/api/trpc`,
      transformer: superjson,
      async fetch(url, options) {
        const token = await useAuthStore.getState().token;
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            ...(token ? { Authorization: "Bearer " + token } : {}),
          },
        });
      },
    }),
  ],
});

export default function App() {
  const restoreToken = useAuthStore((state) => state.restoreToken);

  useEffect(() => {
    // Restore token from AsyncStorage on app start
    restoreToken();
  }, [restoreToken]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
