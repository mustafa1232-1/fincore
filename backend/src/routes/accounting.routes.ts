import { Router } from "express";
import multer from "multer";
import { accountingController } from "../controllers/accounting.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import {
  accountCreateSchema,
  accountUpdateSchema,
  idParamSchema,
  journalCreateSchema,
  paginationQuerySchema,
  trialBalanceImportSchema,
  trialBalanceQuerySchema
} from "../models/validators";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const accountingRouter = Router();

accountingRouter.use(requireAuth, requireModulePermission("accounting", "read"));

accountingRouter.get("/accounts", asyncHandler(accountingController.listAccounts));
accountingRouter.post(
  "/accounts",
  requireModulePermission("accounting", "write"),
  validate({ body: accountCreateSchema }),
  asyncHandler(accountingController.createAccount)
);
accountingRouter.patch(
  "/accounts/:id",
  requireModulePermission("accounting", "write"),
  validate({ params: idParamSchema, body: accountUpdateSchema }),
  asyncHandler(accountingController.updateAccount)
);
accountingRouter.delete(
  "/accounts/:id",
  requireModulePermission("accounting", "delete"),
  validate({ params: idParamSchema }),
  asyncHandler(accountingController.deleteAccount)
);

accountingRouter.post(
  "/journals",
  requireModulePermission("accounting", "write"),
  validate({ body: journalCreateSchema }),
  asyncHandler(accountingController.createJournalEntry)
);
accountingRouter.get(
  "/journals",
  validate({ query: paginationQuerySchema }),
  asyncHandler(accountingController.listJournalEntries)
);

accountingRouter.get(
  "/trial-balance",
  validate({ query: trialBalanceQuerySchema }),
  asyncHandler(accountingController.trialBalance)
);

accountingRouter.post(
  "/trial-balance/import",
  requireModulePermission("accounting", "write"),
  upload.single("file"),
  validate({ body: trialBalanceImportSchema }),
  asyncHandler(accountingController.importTrialBalance)
);
