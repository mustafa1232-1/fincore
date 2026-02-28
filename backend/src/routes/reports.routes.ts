import { Router } from "express";
import { reportsController } from "../controllers/reports.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import { financialReportQuerySchema } from "../models/validators";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireModulePermission("reports", "read"));

reportsRouter.get(
  "/trial-balance",
  validate({ query: financialReportQuerySchema }),
  asyncHandler(reportsController.trialBalance)
);

reportsRouter.get(
  "/income-statement",
  validate({ query: financialReportQuerySchema }),
  asyncHandler(reportsController.incomeStatement)
);

reportsRouter.get(
  "/balance-sheet",
  validate({ query: financialReportQuerySchema }),
  asyncHandler(reportsController.balanceSheet)
);

reportsRouter.get(
  "/cash-flow",
  validate({ query: financialReportQuerySchema }),
  asyncHandler(reportsController.cashFlow)
);
