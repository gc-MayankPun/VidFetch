import express from "express";
import path from "path";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.static("./public"));

// @Routes
import videoRouter from "./routes/video.routes.js";

app.use("/api/videos", videoRouter);

app.use("*name", (req, res) => { 
  res.sendFile(path.join(__dirname, "..", "/public/index.html"));
});

export default app;
