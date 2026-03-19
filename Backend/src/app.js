import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public"))); 

// @Routes
import videoRouter from "./routes/video.routes.js";

app.use("/api/videos", videoRouter);

app.get("/test-ytdlp", async (req, res) => {
  const { execSync } = await import("child_process");
  try {
    const version = execSync("/usr/local/bin/yt-dlp --version").toString().trim();
    res.json({ version });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get("/test-ytdlp", async (req, res) => {
  const { spawn } = await import("child_process");
  const chunks = [];
  const proc = spawn("/usr/local/bin/yt-dlp", [
    "--dump-json",
    "--no-playlist",
    "--socket-timeout", "30",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  ]);
  proc.stdout.on("data", d => chunks.push(d));
  proc.stderr.on("data", d => console.error("stderr:", d.toString()));
  proc.on("close", code => {
    if (code === 0) {
      const info = JSON.parse(Buffer.concat(chunks).toString());
      res.json({ ok: true, title: info.title });
    } else {
      res.json({ ok: false, code });
    }
  });
  setTimeout(() => { proc.kill(); res.json({ ok: false, error: "timed out" }); }, 30000);
});

app.use("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

export default app;
