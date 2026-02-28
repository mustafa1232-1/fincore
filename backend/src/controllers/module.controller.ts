import { Request, Response } from "express";
import { moduleService } from "../services/module.service";

export const moduleController = {
  async list(req: Request, res: Response) {
    const tenantId = req.user!.tenantId;
    const result = await moduleService.list(tenantId);
    res.status(200).json(result);
  },

  async toggle(req: Request, res: Response) {
    const tenantId = req.user!.tenantId;
    const moduleKey = req.params.key as Parameters<typeof moduleService.toggle>[1];
    const result = await moduleService.toggle(tenantId, moduleKey, req.body.enabled);
    res.status(200).json(result);
  }
};
