import { Router } from "express";
import multer from "multer";
import { filesController } from "../controllers/files.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const filesRouter = Router();

filesRouter.use(requireAuth);
filesRouter.post("/upload", upload.single("file"), asyncHandler(filesController.upload));
