import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import { getBaseApiUrl } from "./config";

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<UploadResult | null> {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    const baseUrl = getBaseApiUrl();

    // 1. Get presigned URL from backend
    const prepareRes = await fetch(`${baseUrl}/api/upload/prepare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        filename: fileName,
        contentType: mimeType || "application/octet-stream",
        prefix: "content",
      }),
    });

    if (!prepareRes.ok) {
      throw new Error(`Failed to prepare upload: ${prepareRes.statusText}`);
    }

    const { uploadUrl, publicUrl, key } = await prepareRes.json();

    // 2. Upload file data directly to presigned URL
    if (Platform.OS === "web") {
      // On web, fetch the blob from blob: or data: URL
      const blobRes = await fetch(fileUri);
      const blob = await blobRes.blob();

      await axios.put(uploadUrl, blob, {
        headers: { "Content-Type": mimeType },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(e.loaded, e.total);
          }
        },
      });
    } else {
      // On native mobile (Android/iOS)
      // Read file into blob or FormData
      const response = await fetch(fileUri);
      const blob = await response.blob();

      await axios.put(uploadUrl, blob, {
        headers: { "Content-Type": mimeType },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(e.loaded, e.total);
          }
        },
      });
    }

    return { url: publicUrl, key };
  } catch (err) {
    console.error("[Upload] Error uploading file:", err);
    return null;
  }
}
