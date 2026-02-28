import { Request, Response } from "express";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  },

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body);
    res.status(200).json(result);
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.body);
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    res.status(200).json({ user: req.user });
  }
};
