import React, { useState, useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getCachedAuthToken } from "../src/lib/authTokenCache";
import { trpc } from "../src/lib/trpc";
import { getTrpcUrl } from "../src/lib/config";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { WebContainer } from "../src/components/WebContainer";
import { LocationTracker } from "../src/services/LocationTracker";
import { View, ActivityIndicator, StyleSheet, Platform, AppState, BackHandler } from "react-native";
import * as Location from "expo-location";

function RootNavigation() {
  const { theme, colors } = useTheme();
  const { isAuthenticated, loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [locationBlocked, setLocationBlocked] = useState(false);

  const requiresLocation = Platform.OS === "android" && isAuthenticated && user?.role !== "admin";

  useEffect(() => {
    if (!requiresLocation) {
      setLocationBlocked(false);
      return;
    }

    let cancelled = false;
    let prompting = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const enforceLocation = async () => {
      if (cancelled || prompting) return;
      prompting = true;
      try {
        // Step 1: location services must be ON
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (!cancelled) setLocationBlocked(true);
          // Triggers "For a better experience, turn on device location" built-in dialog
          try { await Location.enableNetworkProviderAsync(); } catch {}
          if (!cancelled) {
            const nowEnabled = await Location.hasServicesEnabledAsync();
            if (!nowEnabled) {
              retryTimer = setTimeout(enforceLocation, 200);
              return;
            }
          }
        }

        // Step 2: foreground permission
        const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
        if (fgStatus !== "granted") {
          if (!cancelled) setLocationBlocked(true);
          const { status: fgReq } = await Location.requestForegroundPermissionsAsync();
          if (fgReq !== "granted") {
            if (!cancelled) retryTimer = setTimeout(enforceLocation, 200);
            return;
          }
        }

        // Step 3: background (Allow all the time) permission — keep spamming until granted
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus !== "granted") {
          if (!cancelled) setLocationBlocked(true);
          const { status: bgReq } = await Location.requestBackgroundPermissionsAsync();
          if (bgReq !== "granted") {
            if (!cancelled) retryTimer = setTimeout(enforceLocation, 200);
            return;
          }
        }

        // All good
        if (!cancelled) setLocationBlocked(false);
      } catch {
        if (!cancelled) {
          setLocationBlocked(true);
          retryTimer = setTimeout(enforceLocation, 200);
        }
      } finally {
        prompting = false;
      }
    };

    enforceLocation();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        enforceLocation();
      }
    });

    const pollTimer = setInterval(async () => {
      if (cancelled || prompting) return;
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          enforceLocation();
        }
      } catch {}
    }, 3000);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(pollTimer);
      appStateSub.remove();
    };
  }, [requiresLocation]);

  useEffect(() => {
    if (!locationBlocked) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [locationBlocked]);

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
      {locationBlocked && (
        <View
          pointerEvents="auto"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, zIndex: 9999 }]}
        />
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
            const token = await getCachedAuthToken();
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
