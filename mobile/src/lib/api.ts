import Constants from "expo-constants";

export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return extra?.apiUrl?.replace(/\/$/, "") ?? "https://as-wryo.onrender.com";
}

export function getTrpcUrl(): string {
  return `${getApiBaseUrl()}/api/trpc`;
}
