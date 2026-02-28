import { Request, Response } from "express";
import { forecastingService } from "../services/forecasting.service";

export const forecastingController = {
  async create(req: Request, res: Response) {
    const data = await forecastingService.generate({
      tenantId: req.user!.tenantId,
      createdBy: req.user!.userId,
      ...req.body
    });
    res.status(201).json(data);
  },

  async list(req: Request, res: Response) {
    const data = await forecastingService.list(req.user!.tenantId);
    res.status(200).json(data);
  }
};
