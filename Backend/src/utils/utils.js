import { existsSync, mkdirSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

export const YTDLP_BIN = existsSync("/usr/local/bin/yt-dlp")
  ? "/usr/local/bin/yt-dlp"
  : existsSync("/app/yt-dlp")
    ? "/app/yt-dlp"
    : "yt-dlp";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Cookies ───────────────────────────────────────────────────────────────────
export const COOKIES_PATH = path.resolve(__dirname, "../../../cookies.txt");
if (process.env.YOUTUBE_COOKIES) {
  writeFileSync(COOKIES_PATH, process.env.YOUTUBE_COOKIES, "utf-8");
  console.log("[ytdlp.py] cookies.txt written from env var");
}

// ── Python script path ────────────────────────────────────────────────────────
export const PYTHON_SCRIPT = path.resolve(__dirname, "./ytdlp.py");

export const TMP_DIR = path.resolve(__dirname, "../../../tmp");
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

export function runPython(args) {
  return new Promise((resolve, reject) => {
    const cookiesArg = existsSync(COOKIES_PATH) ? [COOKIES_PATH] : [];
    const proc = spawn("python3", [PYTHON_SCRIPT, ...args, ...cookiesArg], {
      env: { ...process.env, YTDLP_BIN }, // ← pass binary path to python
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => {
      console.error("[python stderr]:", d.toString()); // ← helpful for debugging
      stderr += d;
    });

    proc.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`Failed to parse python output: ${stdout}`));
        }
      } else {
        try {
          const errJson = JSON.parse(stderr);
          reject(new Error(errJson.error || stderr));
        } catch {
          reject(new Error(stderr || `python exited with code ${code}`));
        }
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn python3: ${err.message}`));
    });
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
