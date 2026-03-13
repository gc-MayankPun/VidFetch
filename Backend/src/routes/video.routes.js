import downloadLimiter from "../middlewares/rateLimit.middleware.js";
import videoController from "../controllers/video.controller.js";
import { Router } from "express";
const videoRouter = Router();

videoRouter.post("/download", downloadLimiter, videoController.videoInfoController);
videoRouter.get("/download", downloadLimiter, videoController.downloadController);

export default videoRouter;
