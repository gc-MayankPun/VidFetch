import downloadLimiter from "../middlewares/rateLimit.middleware.js";
import videoController from "../controllers/video.controller.js";
import { Router } from "express";
const videoRouter = Router();

videoRouter.post("/info", videoController.videoInfoController);
videoRouter.get("/download", videoController.downloadController);
videoRouter.get("/thumbnail", videoController.thumbnailController);

export default videoRouter;
