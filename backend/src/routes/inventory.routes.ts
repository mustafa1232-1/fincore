import { Router } from "express";
import { inventoryController } from "../controllers/inventory.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireModulePermission } from "../middleware/module-permission";
import { validate } from "../middleware/validate";
import {
  idParamSchema,
  itemCreateSchema,
  itemUpdateSchema,
  stockMoveCreateSchema,
  warehouseCreateSchema
} from "../models/validators";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, requireModulePermission("inventory", "read"));

inventoryRouter.get("/items", asyncHandler(inventoryController.listItems));
inventoryRouter.post(
  "/items",
  requireModulePermission("inventory", "write"),
  validate({ body: itemCreateSchema }),
  asyncHandler(inventoryController.createItem)
);
inventoryRouter.patch(
  "/items/:id",
  requireModulePermission("inventory", "write"),
  validate({ params: idParamSchema, body: itemUpdateSchema }),
  asyncHandler(inventoryController.updateItem)
);

inventoryRouter.get("/warehouses", asyncHandler(inventoryController.listWarehouses));
inventoryRouter.post(
  "/warehouses",
  requireModulePermission("inventory", "write"),
  validate({ body: warehouseCreateSchema }),
  asyncHandler(inventoryController.createWarehouse)
);

inventoryRouter.get("/stock-moves", asyncHandler(inventoryController.listStockMoves));
inventoryRouter.post(
  "/stock-moves",
  requireModulePermission("inventory", "write"),
  validate({ body: stockMoveCreateSchema }),
  asyncHandler(inventoryController.createStockMove)
);
