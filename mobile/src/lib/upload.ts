import { getApiBaseUrl } from "./api";
import { getAuthToken } from "./auth-storage";

export type UploadResult = { url: string; key: string };

export async function deleteUploadedKey(key: string): Promise<void> {
  const token = await getAuthToken();
  try {
    await fetch(`${getApiBaseUrl()}/api/upload/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    // cleanup best-effort
  }
}

export async function uploadFromUri(
  uri: string,
  filename: string,
  contentType: string,
  prefix = "content",
  onProgress?: (pct: number) => void
): Promise<UploadResult | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const prepareRes = await fetch(`${getApiBaseUrl()}/api/upload/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename, contentType, prefix }),
  });

  if (!prepareRes.ok) return null;
  const { key, uploadUrl, publicUrl } = (await prepareRes.json()) as {
    key: string;
    uploadUrl: string;
    publicUrl: string;
  };

  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();

  onProgress?.(10);

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadRes.ok) {
    await deleteUploadedKey(key);
    return null;
  }

  onProgress?.(100);
  return { key, url: publicUrl };
}

export async function uploadMultipartFallback(
  uri: string,
  filename: string,
  mimeType: string,
  prefix = "content"
): Promise<UploadResult | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const form = new FormData();
  form.append("file", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(`${getApiBaseUrl()}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) return null;
  return (await res.json()) as UploadResult;
}

export async function uploadImageUri(
  uri: string,
  prefix = "content",
  onProgress?: (pct: number) => void
): Promise<UploadResult | null> {
  const filename = uri.split("/").pop() ?? `photo-${Date.now()}.jpg`;
  const contentType = filename.endsWith(".png") ? "image/png" : "image/jpeg";
  const result = await uploadFromUri(uri, filename, contentType, prefix, onProgress);
  if (result) return result;
  return uploadMultipartFallback(uri, filename, contentType, prefix);
}
