import express from "express";
import dotenv from "dotenv"
import path from "path";
import cors from "cors";
dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("./public"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

// @Routes
import videoRouter from "./routes/video.routes.js";

app.use("/api/videos", videoRouter);

app.use("*name", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "/public/index.html"));
});

export default app;
