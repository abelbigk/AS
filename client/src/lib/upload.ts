import { toast } from "sonner";
import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Get the base URL for API calls
const getApiBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    return "https://as-wryo.onrender.com";
  }
  return ""; // relative URL on web
};

export async function deleteUploadedKey(key: string): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/upload/${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch (err) {
    // Silent cleanup failure
  }
}

// Open SSE stream for a key, pipe progress to onProgress until 100 or abort
function openProgressStream(
  key: string,
  onProgress: (pct: number) => void,
  abortSignal: AbortSignal
): void {
  const es = new EventSource(`${getApiBaseUrl()}/api/upload/progress/${encodeURIComponent(key)}`);
  es.onmessage = (e) => {
    const pct = parseInt(e.data, 10);
    if (!isNaN(pct)) onProgress(pct);
    if (pct >= 100) es.close();
  };
  es.onerror = () => {
    es.close();
  };
  abortSignal.addEventListener("abort", () => es.close(), { once: true });
}

export function uploadFile(
  file: File,
  onProgress?: (loaded: number, total: number) => void,
  abortSignal?: AbortSignal,
  prefix = "content"
): Promise<{ url: string; key: string } | null> {
  return new Promise(async (resolve) => {
    // 1. Get presigned URL from server
    let presignedData: { key: string; uploadUrl: string; publicUrl: string };
    try {
      // Get JWT token for authentication
      const token = localStorage.getItem("auth_token");
      
      const r = await fetch(`${getApiBaseUrl()}/api/upload/prepare`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ 
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          prefix
        }),
        signal: abortSignal,
      });
      if (!r.ok) { 
        toast.error("Upload failed"); 
        resolve(null); 
        return; 
      }
      presignedData = await r.json();
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Upload failed");
      resolve(null); return;
    }

    if (abortSignal?.aborted) { 
      deleteUploadedKey(presignedData.key); 
      resolve(null); 
      return; 
    }

    // 2. Upload directly to R2 using presigned URL with real progress tracking
    try {
      await axios.put(presignedData.uploadUrl, file, {
        headers: { "Content-Type": file.type || "application/octet-stream" },
        onUploadProgress: (e) => {
          if (e.total) {
            onProgress?.(e.loaded, e.total);
          }
        },
        signal: abortSignal,
      });

      onProgress?.(file.size, file.size);
      resolve({ url: presignedData.publicUrl, key: presignedData.key });
    } catch (error: any) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
        deleteUploadedKey(presignedData.key);
        resolve(null);
      } else {
        toast.error("Upload to R2 failed");
        deleteUploadedKey(presignedData.key);
        resolve(null);
      }
    }
  });
}

export async function uploadMultipleFiles(
  files: File[],
  onProgress?: (loaded: number, total: number) => void,
  abortSignal?: AbortSignal
): Promise<{ url: string; key: string }[]> {
  if (files.length === 0) return [];

  // Get JWT token for authentication
  const token = localStorage.getItem("auth_token");

  // Get presigned URLs for all files
  const presignedDataList: { key: string; uploadUrl: string; publicUrl: string }[] = [];
  for (const file of files) {
    try {
      const r = await fetch(`${getApiBaseUrl()}/api/upload/prepare`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream"
        }),
        signal: abortSignal,
      });
      if (!r.ok) {
        toast.error("Upload preparation failed");
        return [];
      }
      presignedDataList.push(await r.json());
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Upload preparation failed");
      return [];
    }
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const progressPerFile = new Array(files.length).fill(0);

  const updateTotalProgress = () => {
    const totalLoaded = progressPerFile.reduce((a, b) => a + b, 0);
    onProgress?.(totalLoaded, totalBytes);
  };

  if (onProgress) onProgress(0, totalBytes);

  try {
    const results = await Promise.all(
      files.map(async (file, i) => {
        const presignedData = presignedDataList[i];
        
        await axios.put(presignedData.uploadUrl, file, {
          headers: { "Content-Type": file.type || "application/octet-stream" },
          onUploadProgress: (e) => {
            progressPerFile[i] = e.loaded || 0;
            updateTotalProgress();
          },
          signal: abortSignal,
        });

        progressPerFile[i] = file.size;
        updateTotalProgress();
        
        return { url: presignedData.publicUrl, key: presignedData.key };
      })
    );

    return results;
  } catch (error: any) {
    if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
      presignedDataList.forEach(p => deleteUploadedKey(p.key));
    } else {
      toast.error("Upload failed");
    }
    return [];
  }
}
