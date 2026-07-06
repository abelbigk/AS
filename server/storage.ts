import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 config missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getR2Config() {
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucket || !publicUrl) {
    throw new Error("Cloudflare R2 config missing: set R2_BUCKET, R2_PUBLIC_URL");
  }

  return { bucket, publicUrl: publicUrl.replace(/\/$/, "") };
}

// Upload with progress tracking based on measured upload speed
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array,
  contentType = "application/octet-stream",
  onProgress?: (loaded: number, total: number) => void,
  abortSignal?: AbortSignal
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const { bucket, publicUrl } = getR2Config();
  const total = data.length;

  console.log(`[Storage] Starting upload: ${relKey}, size: ${total} bytes (${(total / 1024 / 1024).toFixed(2)} MB)`);

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: relKey,
      Body: data,
      ContentType: contentType,
    },
    partSize: 5 * 1024 * 1024,
    queueSize: 1,
  });

  let lastProgressTime = Date.now();
  let lastProgressBytes = 0;

  // Abort R2 upload if signal is triggered
  if (abortSignal) {
    abortSignal.addEventListener("abort", () => {
      console.log(`[Storage] Abort signal received, terminating upload`);
      upload.abort();
    });
  }

  if (onProgress) {
    upload.on("httpUploadProgress", (progress) => {
      const currentLoaded = progress.loaded ?? 0;
      const now = Date.now();
      const timeDelta = (now - lastProgressTime) / 1000;
      
      // Calculate speed every 0.6+ seconds
      if (timeDelta >= 0.6 && lastProgressBytes > 0) {
        const bytesDelta = currentLoaded - lastProgressBytes;
        const speedKBps = (bytesDelta / timeDelta) / 1024;
        console.log(`%c[R2 UPLOAD SPEED] ${speedKBps.toFixed(2)} KB/s (${(speedKBps / 1024).toFixed(2)} MB/s)`, 'color: #00ff00');
        lastProgressTime = now;
      } else if (lastProgressBytes === 0) {
        // First progress event
        lastProgressTime = now;
      }
      
      lastProgressBytes = currentLoaded;
      onProgress(currentLoaded, total);
    });
  }

  try {
    await upload.done();
    console.log(`[Storage] Upload complete: ${relKey}`);
    if (onProgress) onProgress(total, total);
  } catch (error: any) {
    if (error.name === 'AbortError' || abortSignal?.aborted) {
      console.log(`[Storage] Upload aborted: ${relKey}`);
      throw new Error('AbortError');
    }
    throw error;
  }

  return { key: relKey, url: `${publicUrl}/${relKey}` };
}

/**
 * Generate a presigned PUT URL so the browser can upload directly to R2.
 * This is the ONLY way to get real byte-level upload progress via
 * XMLHttpRequest.upload.onprogress — measured at the browser's network layer.
 */
export async function storagePresign(
  relKey: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getR2Client();
  const { bucket, publicUrl } = getR2Config();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: relKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  return { uploadUrl, publicUrl: `${publicUrl}/${relKey}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { publicUrl } = getR2Config();
  return { key: relKey, url: `${publicUrl}/${relKey}` };
}

export async function storageDelete(key: string): Promise<void> {
  const client = getR2Client();
  const { bucket } = getR2Config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
