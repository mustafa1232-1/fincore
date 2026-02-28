import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireModulePermission("dashboard", "read"));

dashboardRouter.get("/overview", asyncHandler(dashboardController.overview));
dashboardRouter.get("/stream", asyncHandler(dashboardController.stream));
