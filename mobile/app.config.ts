import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "AS",
  slug: "as",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  scheme: "as",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.as.app",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0a0a0a",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    package: "com.as.app",
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://as-wryo.onrender.com",
  },
};

export default config;
