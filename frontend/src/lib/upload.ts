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

    // 2. Upload file data
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
      return { url: publicUrl, key };
    } else {
      // Native iOS / Android:
      // Try multipart upload to /api/upload first to avoid presigned PUT chunking issues on mobile
      try {
        const uploadTask = FileSystem.createUploadTask(
          `${baseUrl}/api/upload`,
          fileUri,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "file",
            parameters: {
              key,
            },
          },
          (data) => {
            if (onProgress && data.totalBytesExpectedToSend > 0) {
              onProgress(data.totalBytesSent, data.totalBytesExpectedToSend);
            }
          }
        );

        const result = await uploadTask.uploadAsync();
        if (result && result.status >= 200 && result.status < 300) {
          const resData = JSON.parse(result.body);
          return { url: resData.url, key: resData.key };
        }
      } catch (nativeErr) {
        console.warn("[Upload] Native multipart upload failed, attempting direct presigned PUT:", nativeErr);
      }

      // Fallback: try direct presigned PUT
      try {
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
        if (result && result.status >= 200 && result.status < 300) {
          return { url: publicUrl, key };
        }
      } catch (putErr) {
        console.warn("[Upload] Direct presigned PUT failed:", putErr);
      }

      // Final fallback: fetch blob and PUT via axios
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

      return { url: publicUrl, key };
    }
  } catch (err) {
    console.error("[Upload] Error uploading file:", err);
    return null;
  }
}
