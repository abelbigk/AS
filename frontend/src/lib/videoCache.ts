import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory}video_cache/`;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours in milliseconds

// Track in-flight downloads so we don't start duplicate downloads for the same URL
const inFlightDownloads = new Map<string, Promise<string>>();

/**
 * Ensures the video cache directory exists on native devices.
 */
async function ensureDirExists(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true });
    }
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Generates a stable, safe local filename for a given remote video URL.
 */
function getLocalCachePath(remoteUri: string): string {
  // Strip query parameters
  const cleanUri = remoteUri.split("?")[0];
  // Create a clean alphanumeric filename with last 50 chars
  const sanitized = cleanUri.replace(/[^a-zA-Z0-9]/g, "_");
  const ext = cleanUri.toLowerCase().endsWith(".webm") ? ".webm" : ".mp4";
  return `${VIDEO_CACHE_DIR}${sanitized.slice(-50)}${ext}`;
}

/**
 * Returns a cached local video URI if already downloaded and less than 2 days old.
 * If not cached, returns the remote URI for immediate streaming, and kicks off
 * a background download so subsequent plays are instant with zero buffering.
 */
export async function getOrCacheVideoUri(remoteUri: string): Promise<string> {
  if (Platform.OS === "web" || !remoteUri || !remoteUri.startsWith("http")) {
    return remoteUri;
  }

  try {
    await ensureDirExists();
    const localUri = getLocalCachePath(remoteUri);
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists && (fileInfo as any).size > 0) {
      const now = Date.now();
      const modTime = (fileInfo as any).modificationTime
        ? (fileInfo as any).modificationTime * 1000
        : now;

      // If file is within the 2-day cache window, serve instantly from disk!
      if (now - modTime < TWO_DAYS_MS) {
        return localUri;
      }

      // If expired (> 2 days), clean it up and re-cache in background
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }

    // Start background caching if not already running for this URL
    if (!inFlightDownloads.has(remoteUri)) {
      const downloadPromise = (async () => {
        try {
          const res = await FileSystem.downloadAsync(remoteUri, localUri);
          return res.uri;
        } catch (err) {
          return remoteUri;
        } finally {
          inFlightDownloads.delete(remoteUri);
        }
      })();

      inFlightDownloads.set(remoteUri, downloadPromise);
    }

    // Return remote URL immediately so playback starts with zero delay
    return remoteUri;
  } catch (err) {
    return remoteUri;
  }
}
