import { Router } from "express";
import { budgetingController } from "../controllers/budgeting.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import { budgetCalculateSchema, budgetCreateSchema } from "../models/validators";

export const budgetingRouter = Router();

budgetingRouter.use(requireAuth, requireModulePermission("budgeting", "read"));

budgetingRouter.post(
  "/calculate",
  requireModulePermission("budgeting", "write"),
  validate({ body: budgetCalculateSchema }),
  asyncHandler(budgetingController.calculate)
);

budgetingRouter.post(
  "/",
  requireModulePermission("budgeting", "write"),
  validate({ body: budgetCreateSchema }),
  asyncHandler(budgetingController.create)
);

budgetingRouter.get("/", asyncHandler(budgetingController.list));
