import ytdlp from "yt-dlp-exec";
import { Readable } from "stream";

export async function videoDownloadController(req, res) {
  const { url } = req.body; 

  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      jsRuntimes: "node",
    });

    const formats = info.formats
      .filter(
        (f) =>
          f.ext === "mp4" &&
          f.protocol === "https" &&
          f.acodec !== "none" &&
          f.vcodec !== "none",
      )
      .map((f) => ({
        quality: f.format_note || `${f.height}p`,
        url: f.url,
      }));

    res.status(200).json({
      message: "Video fetched successfully",
      video: {
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        formats,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch video",
    });
  }
}

export async function proxyDownloadController(req, res) {
  const { url } = req.query;

  try {
    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    const response = await fetch(url);

    const stream = Readable.fromWeb(response.body);

    res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
    res.setHeader("Content-Type", "video/mp4");

    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: "Download failed" });
  }
}

export default { videoDownloadController, proxyDownloadController };
