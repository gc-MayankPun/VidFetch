import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  isValidYouTubeUrl,
  normalizeYouTubeUrl,
  runPython,
  TMP_DIR,
  COOKIES_PATH,
  YTDLP_BIN,
} from "../utils/utils.js";

const cookiesArgs = existsSync(COOKIES_PATH) ? ["--cookies", COOKIES_PATH] : [];
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── POST /api/videos/info ────────────────────────────────────────────────────

async function videoInfoController(req, res) {
  const { url } = req.body;

  if (!url || !isValidYouTubeUrl(url)) {
    return res.status(400).json({ message: "Invalid or missing YouTube URL" });
  }

  try {
    const cleanUrl = normalizeYouTubeUrl(url);
    console.log("Original URL:", url);
    console.log("Clean URL:", cleanUrl);
    const result = await runPython(["info", cleanUrl]);

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
        url: cleanUrl, // ← return cleanUrl so downloads also use it
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

  const cleanUrl = normalizeYouTubeUrl(url);

  // ── MP3 ───────────────────────────────────────────────────────────────────
  if (type === "mp3") {
    try {
      res.setHeader("Content-Disposition", `attachment; filename="audio.webm"`);
      res.setHeader("Content-Type", "audio/webm");
      res.setHeader("Transfer-Encoding", "chunked");

      const child = spawn(YTDLP_BIN, [
        "-f",
        "bestaudio[ext=webm]/bestaudio",
        "-o",
        "-",
        ...cookiesArgs,
        "--user-agent",
        USER_AGENT,
        "--extractor-args",
        "youtube:player_client=web",
        "--socket-timeout",
        "30",
        "--http-chunk-size",
        "1048576",
        cleanUrl,
      ]);

      child.stdout.pipe(res);

      child.stderr.on("data", (data) => {
        console.error("yt-dlp stderr:", data.toString());
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
        res
          .status(500)
          .json({ message: "MP3 download failed: " + err.message });
    }
    return;
  }

  // ── MP4 ───────────────────────────────────────────────────────────────────
  if (type === "mp4") {
    try {
      res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Transfer-Encoding", "chunked");

      const child = spawn(YTDLP_BIN, [
        "-f",
        "best[ext=mp4]",
        "-o",
        "-",
        ...cookiesArgs,
        "--user-agent",
        USER_AGENT,
        "--extractor-args",
        "youtube:player_client=web",
        "--socket-timeout",
        "30",
        "--http-chunk-size",
        "1048576",
        cleanUrl,
      ]);

      child.stdout.pipe(res);

      child.stderr.on("data", (data) => {
        console.error("yt-dlp stderr:", data.toString());
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
        res
          .status(500)
          .json({ message: "MP4 download failed: " + err.message });
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
