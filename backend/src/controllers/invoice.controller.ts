import { Request, Response } from "express";
import { invoiceService } from "../services/invoice.service";

export const invoiceController = {
  async create(req: Request, res: Response) {
    const data = await invoiceService.create({
      tenantId: req.user!.tenantId,
      createdBy: req.user!.userId,
      ...req.body
    });
    res.status(201).json(data);
  },

  async list(req: Request, res: Response) {
    const data = await invoiceService.list(req.user!.tenantId);
    res.status(200).json(data);
  }
};
