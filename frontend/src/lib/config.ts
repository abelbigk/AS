import { Platform } from "react-native";
import Constants from "expo-constants";

export function getBaseApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Default to live Render backend
  return "https://as-wryo.onrender.com";
}

export function getTrpcUrl(): string {
  return `${getBaseApiUrl()}/api/trpc`;
}

