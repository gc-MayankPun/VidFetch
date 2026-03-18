import { existsSync, mkdirSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const YT_DLP = process.env.YTDLP_PATH || "yt-dlp";

const COOKIES_PATH = path.resolve(__dirname, "../../../cookies.txt");

if (process.env.YOUTUBE_COOKIES) {
  writeFileSync(COOKIES_PATH, process.env.YOUTUBE_COOKIES, "utf-8");
  console.log("[yt-dlp] cookies.txt written from env var");
}

export const BROWSER_ARGS = [
  "--user-agent",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "--add-header",
  "Accept-Language:en-US,en;q=0.9",
  "--add-header",
  "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "--extractor-args",
  "youtube:player_client=web,mweb",
  ...(existsSync(COOKIES_PATH) ? ["--cookies", COOKIES_PATH] : []),
];

export const TMP_DIR = path.resolve(__dirname, "../../../tmp");
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

export function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, [...BROWSER_ARGS, ...args]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

export function isValidYouTubeUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "youtu.be" ||
      u.hostname === "m.youtube.com"
    );
  } catch {
    return false;
  }
}
