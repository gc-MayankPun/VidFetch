import app from "./src/app.js";
import { execSync, spawn } from "child_process";

// Verify yt-dlp binary at startup
try {
  const version = execSync("/usr/local/bin/yt-dlp --version").toString().trim();
  console.log("[yt-dlp] version:", version);
} catch (e) {
  console.error("[yt-dlp] binary check failed:", e.message);
}

app.listen(3000, () => {
  console.log("Server listening on PORT 3000");

  // Warm up yt-dlp
  const probe = spawn("/usr/local/bin/yt-dlp", ["--version"]);
  probe.stdout.on("data", d => console.log("[yt-dlp warmup]", d.toString().trim()));
  probe.on("close", code => console.log(`[yt-dlp warmup] exited ${code}`));
});