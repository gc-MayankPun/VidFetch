import youtubedl from "youtube-dl-exec";
import { spawn } from "child_process";
import path from "path";

async function videoInfoController(req, res) {
  const { url } = req.body;

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      cookies: '/path/to/cookies.txt'
    });

    // 1️⃣ Best video+audio
    const videoAudioFormats = info.formats
      .filter(
        (f) =>
          f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none",
      )
      .sort((a, b) => (b.height || 0) - (a.height || 0)); // highest resolution first
    const bestVideoAudio = videoAudioFormats[0]; // take only the best

    // 2️⃣ Best audio-only
    const audioOnlyFormats = info.formats
      .filter(
        (f) =>
          (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none",
      )
      .sort((a, b) => (b.abr || 0) - (a.abr || 0)); // highest bitrate first
    const bestAudioOnly = audioOnlyFormats[0]; // take only the best

    const formats = [];

    if (bestVideoAudio) {
      formats.push({
        itag: bestVideoAudio.format_id,
        label:
          bestVideoAudio.format_note ||
          bestVideoAudio.resolution ||
          bestVideoAudio.ext,
        ext: bestVideoAudio.ext,
        type: "video+audio",
      });
    }

    if (bestAudioOnly) {
      formats.push({
        itag: bestAudioOnly.format_id,
        label: `Audio - ${bestAudioOnly.ext}`,
        ext: bestAudioOnly.ext,
        type: "audio-only",
      });
    }

    res.status(200).json({
      message: "Video fetched successfully",
      video: {
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        formats,
        url,
      },
    });
  } catch (err) {
    console.error("Video fetch error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch video", error: err.message });
  }
}

async function downloadController(req, res) {
  const { url, itag } = req.query;
  if (!url || !itag)
    return res.status(400).json({ message: "URL and itag required" });

  try {
    // Local yt-dlp binary path
    const ytDlpPath = path.resolve("./node_modules/youtube-dl-exec/bin/yt-dlp");

    // Spawn yt-dlp to stream video
    const downloadProcess = spawn(ytDlpPath, [
      url,
      "-f",
      itag,
      "-o",
      "-", // stdout
    ]);

    downloadProcess.on("error", (err) => {
      console.error("yt-dlp spawn error:", err);
      if (!res.headersSent)
        res
          .status(500)
          .json({ message: "Download failed", error: err.message });
    });

    // Set headers for browser download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="video.${itag}.mp4"`,
    );
    res.setHeader("Content-Type", "video/mp4");

    // Pipe yt-dlp stdout to response
    downloadProcess.stdout.pipe(res);
    downloadProcess.stderr.pipe(process.stderr);

    // End response when process closes
    downloadProcess.on("close", () => {
      res.end();
    });
  } catch (err) {
    console.error("Download controller error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Download failed", error: err.message });
  }
}

export default { videoInfoController, downloadController };
