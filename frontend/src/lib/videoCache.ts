import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory}video_cache/`;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours in milliseconds
const MAX_CACHE_BYTES = 250 * 1024 * 1024; // 250 MB cap
const TARGET_PRUNE_BYTES = 200 * 1024 * 1024; // Prune down to 200 MB

// Track in-flight downloads so we don't start duplicate downloads for the same URL
const inFlightDownloads = new Map<string, Promise<string>>();
let lastPruneMs = 0;
let pruneInFlight: Promise<void> | null = null;

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
 * Fast deterministic FNV-1a 32-bit hash for collision-safe cache filenames.
 */
function hashString(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generates a stable, collision-safe local filename for a given remote video URL.
 */
function getLocalCachePath(remoteUri: string): string {
  const cleanUri = remoteUri.split("?")[0];
  const sanitized = cleanUri.replace(/[^a-zA-Z0-9]/g, "_");
  const ext = cleanUri.toLowerCase().endsWith(".webm") ? ".webm" : ".mp4";
  return `${VIDEO_CACHE_DIR}${hashString(cleanUri)}_${sanitized.slice(-24)}${ext}`;
}

/**
 * Evicts expired (>48h) and oldest cached videos if total cache size exceeds MAX_CACHE_BYTES.
 */
async function pruneVideoCacheIfNeeded(force = false): Promise<void> {
  if (Platform.OS === "web") return;
  const now = Date.now();
  if (!force && now - lastPruneMs < 30000) return;
  if (pruneInFlight) return pruneInFlight;
  lastPruneMs = now;

  pruneInFlight = (async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(VIDEO_CACHE_DIR);
      if (files.length === 0) return;

      const entries: Array<{ uri: string; size: number; modTime: number }> = [];
      let totalSize = 0;

      for (const name of files) {
        const uri = `${VIDEO_CACHE_DIR}${name}`;
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (!info.exists) continue;
          const size = (info as any).size ?? 0;
          const modTime = (info as any).modificationTime
            ? (info as any).modificationTime * 1000
            : now;

          if (now - modTime >= TWO_DAYS_MS || size <= 0) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } else {
            totalSize += size;
            entries.push({ uri, size, modTime });
          }
        } catch {}
      }

      if (totalSize > MAX_CACHE_BYTES) {
        entries.sort((a, b) => a.modTime - b.modTime); // Oldest first
        for (const entry of entries) {
          if (totalSize <= TARGET_PRUNE_BYTES) break;
          await FileSystem.deleteAsync(entry.uri, { idempotent: true });
          totalSize -= entry.size;
        }
      }
    } catch {
      // Non-fatal
    } finally {
      pruneInFlight = null;
    }
  })();

  return pruneInFlight;
}

/**
 * Checks if a video is already cached locally (< 2 days old) without triggering a download.
 */
export async function getCachedVideoUriOnly(remoteUri: string): Promise<string | null> {
  if (Platform.OS === "web" || !remoteUri || !remoteUri.startsWith("http")) {
    return null;
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
      if (now - modTime < TWO_DAYS_MS) {
        return localUri;
      }
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
  } catch {}
  return null;
}

/**
 * Returns a cached local video URI if already downloaded and less than 2 days old.
 * If not cached, returns the remote URI for immediate streaming, and kicks off
 * a background download so subsequent plays, loops, and seeks are 100% instant from disk.
 * Invokes onCached callback as soon as the background download completes.
 */
export async function getOrCacheVideoUri(
  remoteUri: string,
  onCached?: (localUri: string) => void
): Promise<string> {
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
        onCached?.(localUri);
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
          if (res.status >= 200 && res.status < 300 && res.uri) {
            onCached?.(res.uri);
            pruneVideoCacheIfNeeded(true).catch(() => {});
            return res.uri;
          }
          return remoteUri;
        } catch (err) {
          return remoteUri;
        } finally {
          inFlightDownloads.delete(remoteUri);
        }
      })();

      inFlightDownloads.set(remoteUri, downloadPromise);
    } else {
      inFlightDownloads.get(remoteUri)?.then((cached) => {
        if (cached && cached.startsWith("file://")) {
          onCached?.(cached);
        }
      });
    }

    // Return remote URL immediately so playback starts with zero delay
    return remoteUri;
  } catch (err) {
    return remoteUri;
  }
}
