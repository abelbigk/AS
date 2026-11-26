import { getCachedAuthToken } from "./authTokenCache";
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
    const token = await getCachedAuthToken();
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

    const { uploadUrl, publicUrl, key, contentType: preparedMime } = await prepareRes.json();
    const uploadMime = preparedMime || mimeType || "application/octet-stream";

    // 2. Upload file data
    if (Platform.OS === "web") {
      const blobRes = await fetch(fileUri);
      const blob = await blobRes.blob();

      await axios.put(uploadUrl, blob, {
        headers: { "Content-Type": uploadMime },
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
      // Fast path: Direct presigned PUT to Cloudflare R2 via binary streaming
      // (bypasses Render 512MB RAM and 100s timeout limits for large media/videos)
      try {
        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          fileUri,
          {
            headers: {
              "Content-Type": uploadMime,
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
          if (onProgress) onProgress(100, 100);
          return { url: publicUrl, key };
        }
      } catch (putErr) {
        console.warn("[Upload] Direct presigned PUT failed, attempting multipart fallback:", putErr);
      }

      // Fallback: Multipart upload to server
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
            mimeType: uploadMime,
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
          if (onProgress) onProgress(100, 100);
          return { url: resData.url, key: resData.key };
        }
      } catch (nativeErr) {
        console.warn("[Upload] Native multipart upload failed:", nativeErr);
      }

      return null;
    }
  } catch (err) {
    console.error("[Upload] Error uploading file:", err);
    return null;
  }
}
