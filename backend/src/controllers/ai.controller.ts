import { Request, Response } from "express";
import { aiAssistantService } from "../services/ai-assistant.service";

export const aiController = {
  async ask(req: Request, res: Response) {
    const data = await aiAssistantService.ask({
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
      message: req.body.message
    });

    res.status(200).json(data);
  }
};
