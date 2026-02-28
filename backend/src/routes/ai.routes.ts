import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import { aiPromptSchema } from "../models/validators";

export const aiRouter = Router();

aiRouter.use(requireAuth, requireModulePermission("ai_assistant", "read"));

aiRouter.post(
  "/ask",
  requireModulePermission("ai_assistant", "write"),
  validate({ body: aiPromptSchema }),
  asyncHandler(aiController.ask)
);
