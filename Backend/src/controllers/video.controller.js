import { existsSync } from "fs";
import { spawn } from "child_process";
// import {
//   isValidYouTubeUrl,
//   normalizeYouTubeUrl,
//   runWithRetry,
//   YTDLP_BIN,
//   baseArgs,
// } from "../utils/utils.js";

import {
  isValidYouTubeUrl,
  normalizeYouTubeUrl,
  runWithRetry,
  runYtdlp,
  YTDLP_BIN,
  COOKIES_PATH,
  baseArgs,
} from "../utils/utils.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── POST /api/videos/info ────────────────────────────────────────────────────

async function videoInfoController(req, res) {
  const { url } = req.body;

  if (!url || !isValidYouTubeUrl(url)) {
    return res.status(400).json({ message: "Invalid or missing YouTube URL" });
  }

  const cleanUrl = normalizeYouTubeUrl(url);

  try {
    console.log("[info] about to call runYtdlp");
    // video.controller.js — replace the hardcoded args in videoInfoController:
    const raw = await runYtdlp([
      ...baseArgs(), // ← baseArgs() guards existsSync(COOKIES_PATH) for you
      "--dump-json",
      "--no-playlist",
      "--socket-timeout",
      "30",
      cleanUrl,
    ]);
    console.log("[info] runYtdlp returned");
    const info = JSON.parse(raw);
    const formats = info.formats || [];

    // Best video-only
    const videoOnly = formats
      .filter((f) => f.vcodec !== "none" && f.acodec === "none")
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    // Best audio-only
    const audioOnly = formats
      .filter((f) => f.vcodec === "none" && f.acodec !== "none")
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));

    // Best combined
    const combined = formats
      .filter((f) => f.vcodec !== "none" && f.acodec !== "none")
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    const bestVideo = videoOnly[0];
    const bestAudio = audioOnly[0];
    const bestCombined = combined[0];

    const resultFormats = [];

    if (bestVideo && bestAudio) {
      resultFormats.push({
        itag: `${bestVideo.format_id}+${bestAudio.format_id}`,
        label: `${bestVideo.height || "?"}p MP4`,
        ext: "mp4",
        type: "mp4",
      });
    } else if (bestCombined) {
      resultFormats.push({
        itag: bestCombined.format_id,
        label: bestCombined.format_note || "MP4",
        ext: "mp4",
        type: "mp4",
      });
    }

    const mp3Itag =
      bestAudio?.format_id || bestCombined?.format_id || bestVideo?.format_id;
    if (mp3Itag) {
      resultFormats.push({
        itag: mp3Itag,
        label: "MP3 Audio",
        ext: "mp3",
        type: "mp3",
      });
    }

    const thumbnails = (info.thumbnails || [])
      .filter((t) => t.url)
      .sort(
        (a, b) =>
          (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
      );

    res.status(200).json({
      message: "Video fetched successfully",
      video: {
        title: info.title || "",
        thumbnail: thumbnails[0]?.url || info.thumbnail || "",
        duration: info.duration || 0,
        formats: resultFormats,
        url: cleanUrl,
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

// video.controller.js — replace downloadController body:
async function downloadController(req, res) {
  const { url, type } = req.query;
  if (!url) return res.status(400).json({ message: "url is required" });
  if (!isValidYouTubeUrl(url)) return res.status(400).json({ message: "Invalid YouTube URL" });

  const cleanUrl = normalizeYouTubeUrl(url);
  const isAudio = type === "mp3";

  const formatSel = isAudio
    ? "bestaudio[ext=m4a]/bestaudio"
    : "best[ext=mp4]/best";

  const filename = isAudio ? "audio.m4a" : "video.mp4";
  const mime     = isAudio ? "audio/mp4"  : "video/mp4";

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", mime);
  res.setHeader("Transfer-Encoding", "chunked");

  const proc = spawn(YTDLP_BIN, [
    ...baseArgs(),
    "-f", formatSel,
    "-o", "-",           // stream to stdout
    "--socket-timeout", "30",
    "--http-chunk-size", "1048576",
    cleanUrl,
  ]);

  proc.stdout.pipe(res);
  proc.stderr.on("data", d => console.error("[yt-dlp]", d.toString().trim()));
  proc.on("error", err => { if (!res.headersSent) res.status(500).json({ message: "Spawn failed" }); });
  proc.on("close", code => { if (code !== 0 && !res.writableEnded) res.end(); });
  res.on("close", () => proc.kill());
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
