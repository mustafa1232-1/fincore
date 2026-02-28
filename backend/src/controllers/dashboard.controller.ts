import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  async overview(req: Request, res: Response) {
    const data = await dashboardService.overview(req.user!.tenantId);
    res.status(200).json(data);
  },

  async stream(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const push = async () => {
      const payload = await dashboardService.overview(req.user!.tenantId);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    await push();
    const interval = setInterval(() => {
      void push();
    }, 15000);

    req.on("close", () => {
      clearInterval(interval);
    });
  }
};
