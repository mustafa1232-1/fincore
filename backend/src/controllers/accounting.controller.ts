import { Request, Response } from "express";
import { accountingService } from "../services/accounting.service";

export const accountingController = {
  async listAccounts(req: Request, res: Response) {
    const data = await accountingService.listAccountsTree(req.user!.tenantId);
    res.status(200).json(data);
  },

  async createAccount(req: Request, res: Response) {
    const data = await accountingService.createAccount({
      tenantId: req.user!.tenantId,
      ...req.body
    });
    res.status(201).json(data);
  },

  async updateAccount(req: Request, res: Response) {
    const data = await accountingService.updateAccount({
      tenantId: req.user!.tenantId,
      accountId: String(req.params.id),
      ...req.body
    });
    res.status(200).json(data);
  },

  async deleteAccount(req: Request, res: Response) {
    await accountingService.deleteAccount(req.user!.tenantId, String(req.params.id));
    res.status(204).send();
  },

  async createJournalEntry(req: Request, res: Response) {
    const data = await accountingService.createJournalEntry({
      tenantId: req.user!.tenantId,
      createdBy: req.user!.userId,
      ...req.body
    });

    res.status(201).json(data);
  },

  async listJournalEntries(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;

    const data = await accountingService.listJournalEntries(req.user!.tenantId, page, pageSize);
    res.status(200).json(data);
  },

  async trialBalance(req: Request, res: Response) {
    const from = String(req.query.from);
    const to = String(req.query.to);

    const data = await accountingService.generateTrialBalance({
      tenantId: req.user!.tenantId,
      from,
      to,
      createdBy: req.user!.userId
    });

    res.status(200).json(data);
  },

  async importTrialBalance(req: Request, res: Response) {
    if (!req.file?.buffer) {
      res.status(400).json({ message: "Excel file is required" });
      return;
    }

    const postToLedgerRaw = req.body.postToLedger;
    const postToLedger = postToLedgerRaw === true || postToLedgerRaw === "true";

    const data = await accountingService.importTrialBalanceFromExcel({
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
      from: req.body.from,
      to: req.body.to,
      postToLedger,
      fileBuffer: req.file.buffer
    });

    res.status(200).json(data);
  }
};
