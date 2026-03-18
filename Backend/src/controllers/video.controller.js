import { spawn } from "child_process";
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
    try {
      res.setHeader("Content-Disposition", `attachment; filename="audio.mp3"`);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Transfer-Encoding", "chunked");

      // Stream directly from yt-dlp to browser
      const child = spawn("yt-dlp", [
        "-f", itag,
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "-o", "-",  // Output to stdout
        url,
      ]);

      child.stdout.pipe(res);

      child.stderr.on("data", (data) => {
        console.error("yt-dlp error:", data.toString());
      });

      child.on("error", (err) => {
        console.error("MP3 streaming error:", err);
        if (!res.headersSent) {
          res.status(500).json({ message: "MP3 streaming failed" });
        } else {
          res.end();
        }
      });

      child.on("exit", (code) => {
        if (code !== 0 && !res.headersSent) {
          res.status(500).json({ message: "MP3 conversion failed" });
        }
      });
    } catch (err) {
      console.error("MP3 download error:", err.message);
      if (!res.headersSent)
        res.status(500).json({ message: "MP3 download failed: " + err.message });
    }
    return;
  }

  // ── MP4 ───────────────────────────────────────────────────────────────────
  if (type === "mp4") {
    try {
      res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Transfer-Encoding", "chunked");

      // Stream directly from yt-dlp to browser
      const child = spawn("yt-dlp", [
        "-f", "bestvideo+bestaudio/best",
        "--merge-output-format", "mp4",
        "-o", "-",  // Output to stdout
        url,
      ]);

      child.stdout.pipe(res);

      child.stderr.on("data", (data) => {
        console.error("yt-dlp error:", data.toString());
      });

      child.on("error", (err) => {
        console.error("MP4 streaming error:", err);
        if (!res.headersSent) {
          res.status(500).json({ message: "MP4 streaming failed" });
        } else {
          res.end();
        }
      });

      child.on("exit", (code) => {
        if (code !== 0 && !res.headersSent) {
          res.status(500).json({ message: "MP4 download failed" });
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