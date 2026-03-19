import app from "./src/app.js";
import { execSync } from "child_process";

try {
  const head = execSync("head -1 /app/yt-dlp").toString().trim(); 
  console.log("yt-dlp first line:", head);
} catch (e) {
  console.log("could not inspect yt-dlp:", e.message);
}

app.listen(3000, () => console.log("Server listening on PORT 3000"));