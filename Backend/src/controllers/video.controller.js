import { spawn } from "child_process";
import { existsSync } from "fs";
import { execSync } from "child_process";

const YTDLP_BIN = (() => {
  if (existsSync("/usr/local/bin/yt-dlp")) return "/usr/local/bin/yt-dlp";
  try { return execSync("which yt-dlp").toString().trim(); }
  catch { return "yt-dlp"; }
})();

const PROXY = process.env.PROXY_URL || "";
const COOKIES_PATH = process.env.COOKIES_PATH || "";

function baseArgs(client = "web") {
  const args = [
    "--no-playlist",
    "--force-ipv4",
    "--socket-timeout", "30",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "--extractor-args", `youtube:player_client=${client}`,
  ];
  if (PROXY) args.push("--proxy", PROXY);
  if (COOKIES_PATH && existsSync(COOKIES_PATH)) args.push("--cookies", COOKIES_PATH);
  return args;
}

function runYtdlp(extraArgs, url) {
  const clients = ["web", "web_safari", "android", "android_creator"];

  return new Promise(async (resolve, reject) => {
    let lastError = "";

    for (const client of clients) {
      const result = await new Promise((res) => {
        const args = [...baseArgs(client), ...extraArgs, url];
        const proc = spawn(YTDLP_BIN, args);
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d) => (stdout += d));
        proc.stderr.on("data", (d) => (stderr += d));
        proc.on("close", (code) => {
          if (code === 0) res({ ok: true, stdout });
          else res({ ok: false, stderr });
        });
        proc.on("error", (err) => res({ ok: false, stderr: err.message }));
      });

      if (result.ok) return resolve(result.stdout.trim());
      lastError = result.stderr;
      console.error(`[debug] client=${client} stderr=${lastError.slice(-200)}`);
    }

    reject(new Error(lastError || "yt-dlp failed"));
  });
}

// ── POST /api/videos/info ────────────────────────────────────────────────────
export async function videoInfoController(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "url is required" });

  try {
    const raw = await runYtdlp(["--dump-json"], url);
    const info = JSON.parse(raw);
    const formats = info.formats || [];

    const videoOnly = formats
      .filter(f => f.vcodec !== "none" && f.acodec === "none")
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    const audioOnly = formats
      .filter(f => f.vcodec === "none" && f.acodec !== "none")
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));

    const combined = formats
      .filter(f => f.vcodec !== "none" && f.acodec !== "none")
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

    const mp3Source = bestAudio || bestCombined || bestVideo;
    if (mp3Source) {
      resultFormats.push({
        itag: mp3Source.format_id,
        label: "MP3 Audio",
        ext: "mp3",
        type: "mp3",
      });
    }

    const thumbnails = (info.thumbnails || [])
      .filter(t => t.url)
      .sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));

    res.json({
      message: "Video fetched successfully",
      video: {
        title: info.title || "",
        thumbnail: thumbnails[0]?.url || info.thumbnail || "",
        duration: info.duration || 0,
        formats: resultFormats,
        url,
      },
    });
  } catch (err) {
    console.error("Video fetch error:", err.message);
    res.status(500).json({ message: "Failed to fetch video info: " + err.message });
  }
}

// ── GET /api/videos/download ─────────────────────────────────────────────────
export async function downloadController(req, res) {
  const { url, itag, type } = req.query;
  if (!url || !itag) return res.status(400).json({ message: "url and itag are required" });

  const filename = type === "mp3" ? "audio.mp3" : "video.mp4";
  const contentType = type === "mp3" ? "audio/mpeg" : "video/mp4";

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Transfer-Encoding", "chunked");

  const formatArg = type === "mp3" ? "bestaudio/best" : (itag.includes("+") ? itag : "bestvideo+bestaudio/best");
  const clients = ["web", "web_safari", "android", "android_creator"];

  for (const client of clients) {
    const args = [
      ...baseArgs(client),
      "-f", formatArg,
      ...(type === "mp3" ? ["-x", "--audio-format", "mp3", "--audio-quality", "192K"] : ["--merge-output-format", "mp4"]),
      "-o", "-",
      url,
    ];

    const success = await new Promise((resolve) => {
      const proc = spawn(YTDLP_BIN, args);
      proc.stdout.pipe(res, { end: false });
      proc.stderr.on("data", d => console.error(`[dl] client=${client}`, d.toString().slice(-100)));
      proc.on("close", code => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });

    if (success) { res.end(); return; }
  }

  if (!res.headersSent) res.status(500).json({ message: "Download failed" });
  else res.end();
}

// ── GET /api/videos/thumbnail ────────────────────────────────────────────────
export async function thumbnailController(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: "url is required" });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch thumbnail");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    res.setHeader("Content-Disposition", `attachment; filename="thumbnail.${ext}"`);
    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    res.status(500).json({ message: "Failed to download thumbnail" });
  }
}

export default { videoInfoController, downloadController, thumbnailController };