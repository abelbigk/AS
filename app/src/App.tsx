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

const defaultProdApi = 'https://as-wryo.onrender.com';
const getApiBaseUrl = () => {
  const expoApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // Use the .env variable if explicitly set
  if (expoApiUrl && expoApiUrl.startsWith('https://')) {
    return expoApiUrl;
  }
  
  // For local development with explicit localhost URL
  if (expoApiUrl && (expoApiUrl.startsWith('http://localhost') || expoApiUrl.startsWith('http://127.0.0.1'))) {
    return expoApiUrl;
  }
  
  // Default to production
  return Constants.expoConfig?.extra?.apiUrl || defaultProdApi;
};

const apiUrl = getApiBaseUrl();

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
