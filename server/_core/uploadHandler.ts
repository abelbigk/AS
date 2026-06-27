import { nanoid } from "nanoid";
import express, { Request } from "express";
import multer from "multer";
import { storagePut, storageDelete, storagePresign } from "../storage";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import { getDb } from "../../server/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Infinity },
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// SSE connections waiting for progress: key → response
const sseClients = new Map<string, express.Response>();

async function resolveUserId(req: Request): Promise<number | null> {
  // Try JWT authentication first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userId = payload.userId as number;
      
      // Verify user exists in database
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (user) {
        return user.id;
      }
    } catch (error) {
      console.log("[Upload] JWT verification failed:", error);
    }
  }
  
  // Fall back to OAuth if configured
  const isDevMode = !process.env.OAUTH_SERVER_URL && process.env.NODE_ENV !== "production";
  if (isDevMode) return 1;
  try {
    const user = await sdk.authenticateRequest(req);
    return user?.id || null;
  } catch { return null; }
}

function makeKey(userId: number, originalname: string, prefix = "content"): string {
  const ext = originalname.includes(".") ? originalname.split(".").pop() : "";
  return `${prefix}/${userId}/${Date.now()}-${nanoid(8)}${ext ? `.${ext}` : ""}`;
}

function sendProgress(key: string, pct: number) {
  const sseRes = sseClients.get(key);
  if (!sseRes || sseRes.destroyed || sseRes.writableEnded) {
    console.log(`[SSE] No client for key ${key.substring(0, 30)}... (pct: ${pct})`);
    return;
  }
  console.log(`[SSE] Sending ${pct}% for key ${key.substring(0, 30)}...`);
  sseRes.write(`data: ${pct}\n\n`);
  if (pct >= 100) {
    sseClients.delete(key);
    sseRes.end();
  }
}

export function registerUploadRoutes(app: express.Application) {

  // ── SSE progress stream ───────────────────────────────────────────────────
  // Browser opens this BEFORE starting the upload and reads real-time percent.
  app.get("/api/upload/progress/:key(*)", (req: Request, res: express.Response) => {
    const key = decodeURIComponent(req.params.key);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    sseClients.set(key, res);
    req.on("close", () => { sseClients.delete(key); });
  });

  // ── Reserve a key ─────────────────────────────────────────────────────────
  app.post("/api/upload/prepare", async (req: Request, res: express.Response) => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { filename, contentType, prefix } = req.body as { filename: string; contentType?: string; prefix?: string };
      if (!filename) { res.status(400).json({ error: "filename required" }); return; }
      const key = makeKey(userId, filename, prefix || "content");
      const presigned = await storagePresign(key, contentType || "application/octet-stream");
      res.json({ key, ...presigned });
    } catch (error: any) {
      console.error("[Upload Prepare Error]", error.message, error.stack);
      res.status(500).json({ error: error.message || "Failed" });
    }
  });

  // ── Bulk reserve keys ─────────────────────────────────────────────────────
  app.post("/api/upload/prepare-multi", async (req: Request, res: express.Response) => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { filenames } = req.body as { filenames: string[] };
      if (!Array.isArray(filenames) || filenames.length === 0) {
        res.status(400).json({ error: "filenames required" }); return;
      }
      res.json({ keys: filenames.map(name => makeKey(userId, name)) });
    } catch { res.status(500).json({ error: "Failed" }); }
  });

  // ── Single file upload ────────────────────────────────────────────────────
  app.post("/api/upload", upload.single("file"), async (req: Request, res: express.Response) => {
    try {
      if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }
      const userId = await resolveUserId(req);
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

      const { buffer, mimetype, originalname } = req.file;
      const fileKey = (req.body?.key as string) || makeKey(userId, originalname);

      if (res.destroyed) return;

      // Abort R2 upload if client disconnects
      const abortController = new AbortController();
      req.on("close", () => {
        console.log(`[Upload] Client disconnected, aborting R2 upload for ${fileKey.substring(0, 40)}...`);
        abortController.abort();
      });

      const { key, url } = await storagePut(fileKey, buffer, mimetype, (loaded, total) => {
        const pct = Math.min(Math.round((loaded / total) * 100), 99);
        sendProgress(fileKey, pct);
      }, abortController.signal);

      if (res.destroyed || res.writableEnded) {
        storageDelete(key).catch(() => {});
        return;
      }

      sendProgress(fileKey, 100);
      res.json({ url, key });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[Upload] R2 upload aborted`);
      } else if (!res.destroyed) {
        res.status(500).json({ error: "Upload failed" });
      }
    }
  });

  // ── Multi-file upload ─────────────────────────────────────────────────────
  app.post("/api/upload/multi", upload.array("files"), async (req: Request, res: express.Response) => {
    try {
      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) { res.status(400).json({ error: "No files provided" }); return; }
      const userId = await resolveUserId(req);
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

      const preKeys: string[] = (req.body?.keys || "").split(",").filter(Boolean);
      const totalBytes = files.reduce((s, f) => s + f.buffer.length, 0);
      const progressPerFile = new Array(files.length).fill(0);
      const sseKey = preKeys[0] || "";

      if (res.destroyed) return;

      // Abort R2 uploads if client disconnects
      const abortController = new AbortController();
      req.on("close", () => {
        console.log(`[Upload Multi] Client disconnected, aborting R2 uploads`);
        abortController.abort();
      });

      const results = await Promise.all(
        files.map(async (file, i) => {
          const fileKey = preKeys[i] || makeKey(userId, file.originalname);
          return await storagePut(fileKey, file.buffer, file.mimetype, (loaded, total) => {
            progressPerFile[i] = loaded;
            const sumLoaded = progressPerFile.reduce((a, b) => a + b, 0);
            const pct = Math.min(Math.round((sumLoaded / totalBytes) * 100), 99);
            sendProgress(sseKey, pct);
          }, abortController.signal);
        })
      );

      if (res.destroyed || res.writableEnded) {
        results.forEach(r => storageDelete(r.key).catch(() => {}));
        return;
      }

      sendProgress(sseKey, 100);
      res.json(results);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[Upload Multi] R2 uploads aborted`);
      } else if (!res.destroyed) {
        res.status(500).json({ error: "Upload failed" });
      }
    }
  });

  // ── Cancel: delete a reserved key from R2 ────────────────────────────────
  app.delete("/api/upload/:key(*)", async (req: Request, res: express.Response) => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      const key = req.params.key;
      if (!key.startsWith(`content/${userId}/`) && !key.startsWith(`sounds/${userId}/`)) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      await storageDelete(key);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "Delete failed" }); }
  });
}
