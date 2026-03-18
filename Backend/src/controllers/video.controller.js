import { existsSync, readdirSync, unlinkSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  isValidYouTubeUrl,
  runPython,
  TMP_DIR,
} from "../utils/utils.js";

// ─── POST /api/videos/info ────────────────────────────────────────────────────

async function videoInfoController(req, res) {
  const { url } = req.body;

  if (!url || !isValidYouTubeUrl(url)) {
    return res.status(400).json({ message: "Invalid or missing YouTube URL" });
  }

  try {
    const result = await runPython(["info", url]);

    if (!result.ok) {
      throw new Error(result.error || "Unknown error from python script");
    }

    res.status(200).json({
      message: "Video fetched successfully",
      video: {
        title: result.title,
        thumbnail: result.thumbnail,
        duration: result.duration,
        formats: result.formats,
        url,
      },
    });
  } catch (err) {
    console.error("Video fetch error:", err.message);

    if (
      err.message.includes("Sign in") ||
      err.message.includes("bot") ||
      err.message.includes("429") ||
      err.message.includes("confirm")
    ) {
      return res.status(403).json({
        message: "YouTube is rate-limiting this server. Try again in a moment.",
      });
    }

    res.status(500).json({ message: "Failed to fetch video info" });
  }
}

// ─── GET /api/videos/download ─────────────────────────────────────────────────

async function downloadController(req, res) {
  const { url, itag, type } = req.query; 

  if (!url || !itag)
    return res.status(400).json({ message: "url and itag are required" });
  if (!isValidYouTubeUrl(url))
    return res.status(400).json({ message: "Invalid YouTube URL" });

  // ── MP3 ───────────────────────────────────────────────────────────────────
  if (type === "mp3") {
    const uid = randomUUID();
    const tmpBase = path.join(TMP_DIR, uid);

    try {
      // Arguments: url, itag, output_dir (not output filename)
      const result = await runPython(["mp3", url, itag, tmpBase]);
      if (!result.ok) throw new Error(result.error);

      // Use path returned by Python
      let finalPath = result.path;
      if (!existsSync(finalPath)) {
        // Fallback: scan tmp dir for any MP3 file starting with uid
        const files = readdirSync(tmpBase).filter(f => f.endsWith('.mp3'));
        if (files.length === 0) throw new Error("MP3 output file not found after conversion");
        finalPath = path.join(tmpBase, files[0]);
      }

      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(finalPath)}"`);
      res.setHeader("Content-Type", "audio/mpeg");
      res.sendFile(path.resolve(finalPath), (err) => {
        // Clean up after sending
        try {
          if (existsSync(finalPath)) unlinkSync(finalPath);
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      });
    } catch (err) {
      console.error("MP3 conversion error:", err.message);
      if (!res.headersSent)
        res.status(500).json({ message: "MP3 conversion failed: " + err.message });
    }
    return;
  }

  // ── MP4 ───────────────────────────────────────────────────────────────────
  if (type === "mp4") {
    const uid = randomUUID();
    const tmpBase = path.join(TMP_DIR, uid);

    try {
      // Download MP4 to temp directory
      const outputTemplate = path.join(tmpBase, "%(title)s.%(ext)s");
      const result = await runPython(["mp4", url, outputTemplate]);
      if (!result.ok) throw new Error(result.error);

      let finalPath = result.path;
      if (!existsSync(finalPath)) {
        // Fallback: scan tmp dir for any MP4 file starting with uid
        const files = readdirSync(tmpBase).filter(f => f.endsWith('.mp4'));
        if (files.length === 0) throw new Error("MP4 output file not found after download");
        finalPath = path.join(tmpBase, files[0]);
      }

      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(finalPath)}"`);
      res.setHeader("Content-Type", "video/mp4");
      res.sendFile(path.resolve(finalPath), (err) => {
        // Clean up after sending
        try {
          if (existsSync(finalPath)) unlinkSync(finalPath);
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      });
    } catch (err) {
      console.error("MP4 download error:", err.message);
      if (!res.headersSent)
        res.status(500).json({ message: "MP4 download failed: " + err.message });
    }
    return;
  }

  res.status(400).json({ message: "Invalid type — use mp4 or mp3" });
}

// ─── GET /api/videos/thumbnail ────────────────────────────────────────────────

async function thumbnailController(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: "url is required" });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch thumbnail");

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";

    res.setHeader("Content-Disposition", `attachment; filename="thumbnail.${ext}"`);
    res.setHeader("Content-Type", contentType);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Thumbnail proxy error:", err);
    res.status(500).json({ message: "Failed to download thumbnail" });
  }
}

export default { videoInfoController, downloadController, thumbnailController };