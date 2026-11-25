import React, { useState, useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "../src/lib/trpc";
import { getTrpcUrl } from "../src/lib/config";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { WebContainer } from "../src/components/WebContainer";
import { LocationTracker } from "../src/services/LocationTracker";
import { View, ActivityIndicator, StyleSheet } from "react-native";

function RootNavigation() {
  const { theme, colors } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "login";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [isAuthenticated, loading, segments]);

  return (
    <WebContainer>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="subcategory/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="content/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="loc" options={{ headerShown: false }} />
      </Stack>
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingScreen]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </WebContainer>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 3, // 3 minutes cache: instant tab switching
            gcTime: 1000 * 60 * 15, // 15 minutes cache retention
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getTrpcUrl(),
          transformer: superjson,
          async fetch(url, options) {
            const token = await AsyncStorage.getItem("auth_token");
            return fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
          },
        }),
      ],
    })
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <LocationTracker />
                <RootNavigation />
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
});
