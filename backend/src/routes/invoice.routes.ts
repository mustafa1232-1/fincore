import { Router } from "express";
import { invoiceController } from "../controllers/invoice.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import { invoiceCreateSchema } from "../models/validators";

export const invoiceRouter = Router();

invoiceRouter.use(requireAuth, requireModulePermission("pos", "read"));

invoiceRouter.get("/", asyncHandler(invoiceController.list));
invoiceRouter.post(
  "/",
  requireModulePermission("pos", "write"),
  validate({ body: invoiceCreateSchema }),
  asyncHandler(invoiceController.create)
);
