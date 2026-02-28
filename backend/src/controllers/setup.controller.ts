import { Request, Response } from "express";
import { setupService } from "../services/setup.service";

export const setupController = {
  async suggestions(req: Request, res: Response) {
    const result = setupService.getSuggestions(req.body.activity);
    res.status(200).json(result);
  },

  async complete(req: Request, res: Response) {
    const result = await setupService.completeSetup(req.body);
    res.status(201).json(result);
  }
};
