import { Platform } from "react-native";
import Constants from "expo-constants";

export function getBaseApiUrl(): string {
  // Production URL
  const PROD_URL = "https://as-wryo.onrender.com";

  if (Platform.OS === "web") {
    // In web browser dev mode
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      return "http://localhost:3000";
    }
    return PROD_URL;
  }

  // On Native (Expo Go / Android / iOS)
  // Constants.expoConfig?.hostUri returns something like "192.168.1.3:8081"
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    if (ip) {
      return `http://${ip}:3000`;
    }
  }

  return PROD_URL;
}

export function getTrpcUrl(): string {
  return `${getBaseApiUrl()}/api/trpc`;
}
