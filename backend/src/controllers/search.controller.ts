import { Request, Response } from "express";
import { searchService } from "../services/search.service";

export const searchController = {
  async global(req: Request, res: Response) {
    const q = String(req.query.q ?? "").trim();

    if (!q) {
      res.status(200).json({
        accounts: [],
        journalEntries: [],
        invoices: [],
        items: [],
        users: []
      });
      return;
    }

    const data = await searchService.global(req.user!.tenantId, q);
    res.status(200).json(data);
  }
};
