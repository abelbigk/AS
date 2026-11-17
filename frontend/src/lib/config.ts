import { Platform } from "react-native";
import Constants from "expo-constants";

// Live Render backend — always used unless overridden by EXPO_PUBLIC_API_URL env var
const RENDER_URL = "https://as-wryo.onrender.com";

export function getBaseApiUrl(): string {
  // Allow override via env (e.g. for local development: EXPO_PUBLIC_API_URL=http://localhost:3000)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If running in browser on a production domain, automatically adapt to host origin
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location?.origin &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.includes("127.0.0.1")
  ) {
    return window.location.origin;
  }

  // Always use the live Render backend by default
  return RENDER_URL;
}

export function getTrpcUrl(): string {
  return `${getBaseApiUrl()}/api/trpc`;
}
