import { Router } from "express";
import { forecastingController } from "../controllers/forecasting.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import { forecastCreateSchema } from "../models/validators";

export const forecastingRouter = Router();

forecastingRouter.use(requireAuth, requireModulePermission("forecasting", "read"));

forecastingRouter.post(
  "/",
  requireModulePermission("forecasting", "write"),
  validate({ body: forecastCreateSchema }),
  asyncHandler(forecastingController.create)
);
forecastingRouter.get("/", asyncHandler(forecastingController.list));
