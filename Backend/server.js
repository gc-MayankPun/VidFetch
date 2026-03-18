import app from "./src/app.js";

import { execSync } from "child_process";

try {
  const version = execSync("/usr/local/bin/yt-dlp --version").toString().trim();
  console.log("yt-dlp version:", version);
} catch (e) {
  console.log("yt-dlp at /usr/local/bin not found, trying default:");
  try {
    const version2 = execSync("yt-dlp --version").toString().trim();
    console.log("default yt-dlp version:", version2);
  } catch (e2) {
    console.log("yt-dlp not found anywhere:", e2.message);
  }
}

app.listen(3000, () => console.log("Server listening on PORT 3000"));
