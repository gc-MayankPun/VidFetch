import { spawn } from "child_process";
import { existsSync, readdirSync, unlinkSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  isValidYouTubeUrl,
  runPython,
  COOKIES_PATH,
  PYTHON_SCRIPT,
  TMP_DIR,
} from "../utils/utils.js";

const YT_DLP = process.env.YTDLP_PATH || "yt-dlp";

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

  // ── MP3 via Python ────────────────────────────────────────────────────────
  if (type === "mp3") {
    const uid = randomUUID();
    const tmpBase = path.join(TMP_DIR, uid);
    const expectedPath = `${tmpBase}.mp3`;

    try {
      await runPython(["mp3", url, itag, tmpBase]);

      let finalPath = expectedPath;
      if (!existsSync(finalPath)) {
        const match = readdirSync(TMP_DIR).find((f) => f.startsWith(uid));
        if (!match)
          throw new Error("MP3 output file not found after conversion");
        finalPath = path.join(TMP_DIR, match);
      }

      res.setHeader("Content-Disposition", `attachment; filename="audio.mp3"`);
      res.setHeader("Content-Type", "audio/mpeg");
      res.sendFile(path.resolve(finalPath), () => {
        try {
          unlinkSync(finalPath);
        } catch {}
      });
    } catch (err) {
      console.error("MP3 conversion error:", err.message);
      if (!res.headersSent)
        res.status(500).json({ message: "MP3 conversion failed" });
    }
    return;
  }

  // ── MP4 via Python (writes to tmp then streams) ───────────────────────────
  if (type === "mp4") {
    const uid = randomUUID();
    const tmpFile = path.join(TMP_DIR, `${uid}.mp4`);

    try {
      await runPython(["mp4", url, itag, tmpFile]);

      if (!existsSync(tmpFile)) throw new Error("MP4 output file not found");

      res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
      res.setHeader("Content-Type", "video/mp4");
      res.sendFile(path.resolve(tmpFile), () => {
        try {
          unlinkSync(tmpFile);
        } catch {}
      });
    } catch (err) {
      console.error("MP4 download error:", err.message);
      if (!res.headersSent)
        res.status(500).json({ message: "Download failed" });
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

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="thumbnail.${ext}"`,
    );
    res.setHeader("Content-Type", contentType);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Thumbnail proxy error:", err);
    res.status(500).json({ message: "Failed to download thumbnail" });
  }
}

export default { videoInfoController, downloadController, thumbnailController };
