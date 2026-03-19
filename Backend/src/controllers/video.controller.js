import { spawn } from "child_process";
import {
  isValidYouTubeUrl,
  normalizeYouTubeUrl,
  runYtdlp,
  YTDLP_BIN,
  baseArgs,
} from "../utils/utils.js";

// ─── POST /api/videos/info ────────────────────────────────────────────────────

async function videoInfoController(req, res) {
  const { url } = req.body;

  if (!url || !isValidYouTubeUrl(url)) {
    return res.status(400).json({ message: "Invalid or missing YouTube URL" });
  }

  const cleanUrl = normalizeYouTubeUrl(url);

  try {
    console.log("[info] about to call runYtdlp");
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

    const resultFormats = [];

    const thumbnails = (info.thumbnails || [])
      .filter((t) => t.url)
      .sort(
        (a, b) =>
          (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
      );

    // Always add MP4 using a safe fallback format string (not hardcoded format_id)
    resultFormats.push({
      itag: "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", // ← format selector string, not an ID
      label: `${info.height || formats.find((f) => f.vcodec !== "none")?.height || "?"}p MP4`,
      ext: "mp4",
      type: "mp4",
    });

    // Always add MP3
    resultFormats.push({
      itag: "ba/b", // best audio, any format
      label: "MP3 Audio",
      ext: "mp3",
      type: "mp3",
    });

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
  const { url, itag, type } = req.query;
  if (!url || !itag)
    return res.status(400).json({ message: "url and itag are required" });
  if (!isValidYouTubeUrl(url))
    return res.status(400).json({ message: "Invalid YouTube URL" });

  const cleanUrl = normalizeYouTubeUrl(url);
  const isAudio = type === "mp3";
  const filename = isAudio ? "audio.m4a" : "video.mp4";
  const mime = isAudio ? "audio/mp4" : "video/mp4";

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", mime);
  res.setHeader("Transfer-Encoding", "chunked");

  const proc = spawn(YTDLP_BIN, [
    ...baseArgs(),
    "-f",
    decodeURIComponent(itag), // ← use the format selector string directly
    "--merge-output-format",
    "mp4",
    "-o",
    "-",
    "--socket-timeout",
    "30",
    "--http-chunk-size",
    "1048576",
    cleanUrl,
  ]);

  proc.stdout.pipe(res);
  proc.stderr.on("data", (d) => console.error("[yt-dlp]", d.toString().trim()));
  proc.on("error", () => {
    if (!res.headersSent) res.status(500).json({ message: "Spawn failed" });
  });
  proc.on("close", (code) => {
    if (code !== 0 && !res.writableEnded) res.end();
  });
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
