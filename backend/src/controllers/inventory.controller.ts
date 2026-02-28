import { Request, Response } from "express";
import { inventoryService } from "../services/inventory.service";

export const inventoryController = {
  async listItems(req: Request, res: Response) {
    const data = await inventoryService.listItems(req.user!.tenantId);
    res.status(200).json(data);
  },

  async createItem(req: Request, res: Response) {
    const data = await inventoryService.createItem({
      tenantId: req.user!.tenantId,
      ...req.body
    });
    res.status(201).json(data);
  },

  async updateItem(req: Request, res: Response) {
    await inventoryService.updateItem({
      tenantId: req.user!.tenantId,
      itemId: req.params.id,
      ...req.body
    });
    res.status(204).send();
  },

  async listWarehouses(req: Request, res: Response) {
    const data = await inventoryService.listWarehouses(req.user!.tenantId);
    res.status(200).json(data);
  },

  async createWarehouse(req: Request, res: Response) {
    const data = await inventoryService.createWarehouse(req.user!.tenantId, req.body.name, req.body.code);
    res.status(201).json(data);
  },

  async createStockMove(req: Request, res: Response) {
    const data = await inventoryService.createStockMove({
      tenantId: req.user!.tenantId,
      createdBy: req.user!.userId,
      ...req.body
    });
    res.status(201).json(data);
  },

  async listStockMoves(req: Request, res: Response) {
    const data = await inventoryService.listStockMoves(req.user!.tenantId);
    res.status(200).json(data);
  }
};
