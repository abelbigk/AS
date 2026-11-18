import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { getBaseApiUrl } from "./config";

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
  onProgress?: (loaded: number, total: number) => void,
  _abortSignal?: AbortSignal,
  prefix: string = "content"
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
        prefix,
      }),
    });

    if (!prepareRes.ok) {
      const errText = await prepareRes.text();
      throw new Error(`Failed to prepare upload: ${prepareRes.statusText} - ${errText}`);
    }

    const { uploadUrl, publicUrl, key } = await prepareRes.json();

    // 2. Upload file data directly to presigned URL
    if (Platform.OS === "web") {
      const blobRes = await fetch(fileUri);
      const blob = await blobRes.blob();

      await axios.put(uploadUrl, blob, {
        headers: { "Content-Type": mimeType || "application/octet-stream" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(e.loaded, e.total);
          }
        },
      });

      if (onProgress) onProgress(blob.size, blob.size);
    } else {
      // Native iOS / Android: Use expo-file-system uploadAsync for streaming binary uploads with progress
      const uploadTask = FileSystem.createUploadTask(
        uploadUrl,
        fileUri,
        {
          headers: {
            "Content-Type": mimeType || "application/octet-stream",
          },
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        },
        (data) => {
          if (onProgress && data.totalBytesExpectedToSend > 0) {
            onProgress(data.totalBytesSent, data.totalBytesExpectedToSend);
          }
        }
      );

      const result = await uploadTask.uploadAsync();
      if (!result || result.status < 200 || result.status >= 300) {
        // Fallback: try reading as blob via fetch
        const response = await fetch(fileUri);
        const blob = await response.blob();
        await axios.put(uploadUrl, blob, {
          headers: { "Content-Type": mimeType || "application/octet-stream" },
          onUploadProgress: (e) => {
            if (onProgress && e.total) {
              onProgress(e.loaded, e.total);
            }
          },
        });
      }
    }

    return { url: publicUrl, key };
  } catch (err) {
    console.error("[Upload] Error uploading file:", err);
    return null;
  }
}
