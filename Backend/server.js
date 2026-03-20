import app from "./src/app.js";
import { execSync, spawn } from "child_process";
import { YTDLP_BIN } from "./src/utils/utils.js";

try {
  const version = execSync(`${YTDLP_BIN} --version`).toString().trim();   
  console.log("[yt-dlp] version:", version);
} catch (e) {
  console.error("[yt-dlp] binary check failed:", e.message);
}

app.listen(3000, () => {
  console.log("Server listening on PORT 3000");

  const probe = spawn(YTDLP_BIN, ["--version"]);   
  probe.stdout.on("data", d => console.log("[yt-dlp warmup]", d.toString().trim()));
  probe.on("close", code => console.log(`[yt-dlp warmup] exited ${code}`));
});