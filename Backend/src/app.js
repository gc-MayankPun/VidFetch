import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ credentials: true }));

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public"))); 

// @Routes
import videoRouter from "./routes/video.routes.js";

app.use("/api/videos", videoRouter);

app.use("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

export default app;
