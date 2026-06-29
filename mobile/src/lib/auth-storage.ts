import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function decodeTokenExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    if (!payload.exp) return null;
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

export function formatTimeRemaining(token: string): string | null {
  const exp = decodeTokenExpiry(token);
  if (!exp) return null;
  const remainingMs = exp.getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";
  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(remainingMs / 60000)}m`;
}
