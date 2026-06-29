import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { queryClient, trpcClient } from "@/lib/trpc-client";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import RootNavigator from "@/navigation/RootNavigator";
import { useTheme } from "@/context/ThemeContext";

function AppShell() {
  const { mode } = useTheme();
  return (
    <>
      <RootNavigator />
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeProvider>
                <AppShell />
              </ThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
