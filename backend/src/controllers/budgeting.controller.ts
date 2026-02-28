import { Request, Response } from "express";
import { budgetingService } from "../services/budgeting.service";

export const budgetingController = {
  async calculate(req: Request, res: Response) {
    const data = budgetingService.calculate(req.body);
    res.status(200).json(data);
  },

  async create(req: Request, res: Response) {
    const data = await budgetingService.create({
      tenantId: req.user!.tenantId,
      createdBy: req.user!.userId,
      ...req.body
    });

    res.status(201).json(data);
  },

  async list(req: Request, res: Response) {
    const data = await budgetingService.list(req.user!.tenantId);
    res.status(200).json(data);
  }
};
