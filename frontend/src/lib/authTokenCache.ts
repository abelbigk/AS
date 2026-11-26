import AsyncStorage from "@react-native-async-storage/async-storage";

let cachedAuthToken: string | null | undefined = undefined;
let inFlightRead: Promise<string | null> | null = null;

/**
 * Returns the cached auth token from memory (zero disk I/O after first read).
 */
export async function getCachedAuthToken(): Promise<string | null> {
  if (cachedAuthToken !== undefined) {
    return cachedAuthToken;
  }
  if (!inFlightRead) {
    inFlightRead = AsyncStorage.getItem("auth_token")
      .then((t) => {
        cachedAuthToken = t ?? null;
        return cachedAuthToken;
      })
      .catch(() => null)
      .finally(() => {
        inFlightRead = null;
      });
  }
  return inFlightRead;
}

/**
 * Updates the in-memory auth token cache immediately on load, login, or logout.
 */
export function setCachedAuthToken(token: string | null): void {
  cachedAuthToken = token;
}
