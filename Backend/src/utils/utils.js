import { existsSync, mkdirSync, writeFileSync } from "fs";
import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Binary resolution ─────────────────────────────────────────────────────────
export const YTDLP_BIN = (() => {
  const candidates = [
    "/usr/local/bin/yt-dlp",   // ← where your Dockerfile puts it, check FIRST
    "/usr/bin/yt-dlp",
    "/app/yt-dlp",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  try { return execSync("which yt-dlp").toString().trim(); } catch { return "yt-dlp"; }
})();

console.log(
  `[utils] YTDLP_BIN: ${YTDLP_BIN} (exists: ${existsSync(YTDLP_BIN)})`,
);
try {
  const head = execSync(`head -1 ${YTDLP_BIN}`).toString().trim();
  console.log(`[utils] yt-dlp first line: ${head}`);
} catch (e) {
  console.log(`[utils] could not read yt-dlp: ${e.message}`);
}

// ── Cookies ─────────────────────────────────────────────────────────────────── 
export const COOKIES_PATH = path.resolve(process.cwd(), "cookies.txt");
if (process.env.YOUTUBE_COOKIES) {
  writeFileSync(COOKIES_PATH, process.env.YOUTUBE_COOKIES, "utf-8");
  console.log("[utils] cookies.txt written from env var");
}

// ── Tmp dir ───────────────────────────────────────────────────────────────────
export const TMP_DIR = path.resolve(__dirname, "../../../tmp");
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

// ── Base args builder ─────────────────────────────────────────────────────────
export function baseArgs(client = "web") {
  const args = [
    "--no-playlist",
    "--no-warnings",
    "--force-ipv4",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "--extractor-args",
    `youtube:player_client=${client}`,
  ];

  const proxy = process.env.PROXY_URL;
  if (proxy) args.push("--proxy", proxy);

  if (existsSync(COOKIES_PATH)) args.push("--cookies", COOKIES_PATH);

  return args;
}

// ── Run yt-dlp and collect stdout ─────────────────────────────────────────────
export function runYtdlp(args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    console.log(`[yt-dlp] spawning with args: ${args.slice(-3).join(" ")}`);
    const proc = spawn(YTDLP_BIN, args);
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("yt-dlp timed out"));
    }, timeoutMs);

    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

// ── Run with client rotation + retries ───────────────────────────────────────
const CLIENTS = ["web", "android", "ios"];

export async function runWithRetry(extraArgs, url, retries = 1) {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const client of CLIENTS) {
      try {
        const args = [...baseArgs(client), ...extraArgs, url];
        const result = await runYtdlp(args);
        return result;
      } catch (err) {
        lastError = err.message;
        console.error(
          `[debug] client=${client} error=${lastError.slice(-200)}`,
        );
      }
    }

    if (attempt < retries - 1) {
      const wait = 5000 * (attempt + 1);
      console.log(`Retrying in ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  throw new Error(lastError || "yt-dlp failed after retries");
}

// ── URL helpers ───────────────────────────────────────────────────────────────
export function normalizeYouTubeUrl(url) {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/shorts/")) {
      return `https://www.youtube.com/watch?v=${u.pathname.replace("/shorts/", "")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/watch?v=${u.pathname.replace("/", "")}`;
    }
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/watch?v=${v}`;
    return url;
  } catch {
    return url;
  }
}

export function isValidYouTubeUrl(url) {
  try {
    const u = new URL(url);
    return [
      "www.youtube.com",
      "youtube.com",
      "youtu.be",
      "m.youtube.com",
    ].includes(u.hostname);
  } catch {
    return false;
  }
}
