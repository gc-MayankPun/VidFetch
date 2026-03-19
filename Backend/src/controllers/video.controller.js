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
    const raw = await runYtdlp([
      "--dump-json",
      "--no-playlist",
      "--socket-timeout",
      "30",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--cookies",
      COOKIES_PATH,
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

// async function downloadController(req, res) {
//   const { url, itag, type } = req.query;

//   if (!url || !itag)
//     return res.status(400).json({ message: "url and itag are required" });
//   if (!isValidYouTubeUrl(url))
//     return res.status(400).json({ message: "Invalid YouTube URL" });

//   const cleanUrl = normalizeYouTubeUrl(url);
//   const proxy = process.env.PROXY_URL;
//   const proxyArgs = proxy ? ["--proxy", proxy] : [];

//   // ── MP3 ───────────────────────────────────────────────────────────────────
//   if (type === "mp3") {
//     try {
//       res.setHeader("Content-Disposition", `attachment; filename="audio.webm"`);
//       res.setHeader("Content-Type", "audio/webm");
//       res.setHeader("Transfer-Encoding", "chunked");

//       const child = spawn(YTDLP_BIN, [
//         "-f",
//         "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio",
//         "-o",
//         "-",
//         "--user-agent",
//         USER_AGENT,
//         "--extractor-args",
//         "youtube:player_client=web",
//         "--socket-timeout",
//         "30",
//         "--http-chunk-size",
//         "1048576",
//         ...proxyArgs,
//         cleanUrl,
//       ]);

//       child.stdout.pipe(res);
//       child.stderr.on("data", (d) =>
//         console.error("yt-dlp stderr:", d.toString()),
//       );
//       child.on("error", (err) => {
//         console.error("MP3 streaming error:", err);
//         if (!res.headersSent)
//           res.status(500).json({ message: "MP3 streaming failed" });
//         else res.end();
//       });
//       child.on("exit", (code) => {
//         if (code !== 0 && !res.headersSent)
//           res.status(500).json({ message: "MP3 conversion failed" });
//       });
//     } catch (err) {
//       console.error("MP3 download error:", err.message);
//       if (!res.headersSent)
//         res
//           .status(500)
//           .json({ message: "MP3 download failed: " + err.message });
//     }
//     return;
//   }

//   // ── MP4 ───────────────────────────────────────────────────────────────────
//   if (type === "mp4") {
//     try {
//       res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
//       res.setHeader("Content-Type", "video/mp4");
//       res.setHeader("Transfer-Encoding", "chunked");

//       const child = spawn(YTDLP_BIN, [
//         "-f", "best[ext=mp4]/best",
//         "-o", "-",
//         "--user-agent", USER_AGENT,
//         "--extractor-args", "youtube:player_client=web",
//         "--socket-timeout", "30",
//         "--http-chunk-size", "1048576",
//         ...proxyArgs,
//         cleanUrl,
//       1]);

//       child.stdout.pipe(res);
//       child.stderr.on("data", (d) =>
//         console.error("yt-dlp stderr:", d.toString()),
//       );
//       child.on("error", (err) => {
//         console.error("MP4 streaming error:", err);
//         if (!res.headersSent)
//           res.status(500).json({ message: "MP4 streaming failed" });
//         else res.end();
//       });
//       child.on("exit", (code) => {
//         if (code !== 0 && !res.headersSent)
//           res.status(500).json({ message: "MP4 download failed" });
//       });
//     } catch (err) {
//       console.error("MP4 download error:", err.message);
//       if (!res.headersSent)
//         res
//           .status(500)
//           .json({ message: "MP4 download failed: " + err.message });
//     }
//     return;
//   }

//   res.status(400).json({ message: "Invalid type — use mp4 or mp3" });
// }

async function downloadController(req, res) {
  const { url, itag, type } = req.query;

  if (!url || !itag)
    return res.status(400).json({ message: "url and itag are required" });
  if (!isValidYouTubeUrl(url))
    return res.status(400).json({ message: "Invalid YouTube URL" });

  const cleanUrl = normalizeYouTubeUrl(url);

  try {
    const formatSel = type === "mp3" ? "bestaudio" : "best[ext=mp4]/best";
    const raw = await runWithRetry(["--dump-json", "-f", formatSel], cleanUrl);
    const info = JSON.parse(raw);
    const directUrl = info.url || info.formats?.[info.formats.length - 1]?.url;

    if (!directUrl)
      return res.status(500).json({ message: "Could not resolve direct URL" });

    res.redirect(directUrl);
  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).json({ message: "Download failed: " + err.message });
  }
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
