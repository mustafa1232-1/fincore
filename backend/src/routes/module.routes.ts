import { Router } from "express";
import { moduleController } from "../controllers/module.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import { moduleToggleSchema } from "../models/validators";

export const moduleRouter = Router();

moduleRouter.use(requireAuth);

moduleRouter.get(
  "/",
  requireModulePermission("dashboard", "read"),
  asyncHandler(moduleController.list)
);

moduleRouter.patch(
  "/:key",
  requireModulePermission("dashboard", "write"),
  validate({ body: moduleToggleSchema }),
  asyncHandler(moduleController.toggle)
);
