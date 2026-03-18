import { spawn } from "child_process";
import { existsSync, readdirSync, unlinkSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  BROWSER_ARGS,
  isValidYouTubeUrl,
  runYtDlp,
  TMP_DIR,
} from "../utils/utils.js";

const YT_DLP = process.env.YTDLP_PATH || "yt-dlp";

async function videoInfoController(req, res) {
  const { url } = req.body;

  if (!url || !isValidYouTubeUrl(url)) {
    return res.status(400).json({ message: "Invalid or missing YouTube URL" });
  }

  try {
    const raw = await runYtDlp(["--dump-json", "--no-playlist", url]);
    const info = JSON.parse(raw);

    // Best combined (video+audio in one stream — e.g. format 18)
    const combined = (info.formats || [])
      .filter((f) => f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none")
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const bestCombined = combined[0];

    // Best DASH video-only stream
    const videoOnly = (info.formats || [])
      .filter((f) =>
        f.vcodec && f.vcodec !== "none" &&
        (!f.acodec || f.acodec === "none") &&
        (f.ext === "mp4" || f.ext === "webm"),
      )
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const bestVideo = videoOnly[0];

    // Best DASH audio-only stream
    const audioOnly = (info.formats || [])
      .filter((f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none")
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));
    const bestAudio = audioOnly[0];

    const formats = [];

    // ── MP4 ──────────────────────────────────────────────────────────────────
    if (bestVideo && bestAudio) {
      // DASH: merge separate video + audio streams (best quality)
      formats.push({
        itag: `${bestVideo.format_id}+${bestAudio.format_id}`,
        label: `${bestVideo.height}p MP4`,
        ext: "mp4",
        type: "mp4",
      });
    } else if (bestCombined) {
      // Fallback: single combined stream (e.g. 360p format 18)
      formats.push({
        itag: bestCombined.format_id,
        label: bestCombined.format_note || `${bestCombined.height || ""}p` || bestCombined.ext,
        ext: "mp4",
        type: "mp4",
      });
    }

    // ── MP3 ──────────────────────────────────────────────────────────────────
    // Use dedicated audio-only stream if available (better quality),
    // otherwise fall back to extracting audio from the combined stream.
    const mp3SourceItag = bestAudio?.format_id ?? bestCombined?.format_id;
    if (mp3SourceItag) {
      formats.push({
        itag: mp3SourceItag,
        label: "MP3 Audio",
        ext: "mp3",
        type: "mp3",
      });
    }

    const thumbnails = info.thumbnails || [];
    const bestThumb = thumbnails
      .filter((t) => t.url)
      .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))[0];

    res.status(200).json({
      message: "Video fetched successfully",
      video: {
        title: info.title,
        thumbnail: bestThumb?.url || info.thumbnail,
        duration: info.duration,
        formats,
        url,
      },
    });
  } catch (err) {
    console.error("Video fetch error:", err.message);
    if (err.message.includes("Sign in") || err.message.includes("bot") || err.message.includes("429")) {
      return res.status(403).json({ message: "YouTube is rate-limiting this server. Try again in a moment." });
    }
    res.status(500).json({ message: "Failed to fetch video info" });
  }
}

async function downloadController(req, res) {
  const { url, itag, type } = req.query;

  if (!url || !itag)
    return res.status(400).json({ message: "url and itag are required" });
  if (!isValidYouTubeUrl(url))
    return res.status(400).json({ message: "Invalid YouTube URL" });

  // ── MP3 ──────────────────────────────────────────────────────────────────────
  if (type === "mp3") {
    const uid = randomUUID();
    const tmpBase = path.join(TMP_DIR, uid);  // no extension — yt-dlp adds .mp3
    const expectedPath = `${tmpBase}.mp3`;

    try {
      await runYtDlp([
        "-f", itag,
        "--no-playlist",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "-o", tmpBase,
        url,
      ]);

      let finalPath = expectedPath;
      if (!existsSync(finalPath)) {
        const match = readdirSync(TMP_DIR).find((f) => f.startsWith(uid));
        if (!match) throw new Error("MP3 output file not found after conversion");
        finalPath = path.join(TMP_DIR, match);
      }

      res.setHeader("Content-Disposition", `attachment; filename="audio.mp3"`);
      res.setHeader("Content-Type", "audio/mpeg");
      res.sendFile(path.resolve(finalPath), () => {
        try { unlinkSync(finalPath); } catch {}
      });
    } catch (err) {
      console.error("MP3 conversion error:", err.message);
      if (!res.headersSent)
        res.status(500).json({ message: "MP3 conversion failed" });
    }
    return;
  }

  // ── MP4 streamed ──────────────────────────────────────────────────────────────
  try {
    const dl = spawn(YT_DLP, [
      ...BROWSER_ARGS,
      "-f", itag,
      "--no-playlist",
      "--merge-output-format", "mp4",
      "-o", "-",
      url,
    ]);

    dl.on("error", (err) => {
      console.error("yt-dlp spawn error:", err);
      if (!res.headersSent)
        res.status(500).json({ message: "Download failed", error: err.message });
    });

    res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
    res.setHeader("Content-Type", "video/mp4");
    dl.stdout.pipe(res);
    dl.stderr.on("data", (d) => console.error("[yt-dlp]", d.toString()));
    dl.on("close", (code) => {
      if (code !== 0 && !res.headersSent)
        res.status(500).json({ message: "Download failed" });
    });
  } catch (err) {
    console.error("Download controller error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Download failed", error: err.message });
  }
}

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