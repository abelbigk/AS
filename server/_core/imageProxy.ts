import express from "express";

/**
 * GET /api/image-proxy?url=https://...
 * Fetches an external image server-side and streams it back,
 * bypassing browser CORS restrictions for canvas use.
 */
export function registerImageProxy(app: express.Application) {
  app.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url || !url.startsWith("http")) {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }

    try {
      const response = await fetch(url, {
        headers: {
          // Mimic a browser request to avoid bot blocks
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
          "Referer": new URL(url).origin,
        },
      });

      if (!response.ok) {
        res.status(response.status).json({ error: "Failed to fetch image" });
        return;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();

      res.set("Content-Type", contentType);
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (err) {
      res.status(500).json({ error: "Proxy failed" });
    }
  });
}
