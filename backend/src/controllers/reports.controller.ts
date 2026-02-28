import { Request, Response } from "express";
import { financialStatementsService } from "../services/financial-statements.service";
import { accountingService } from "../services/accounting.service";
import { exportService } from "../services/export.service";

export const reportsController = {
  async incomeStatement(req: Request, res: Response) {
    const from = String(req.query.from);
    const to = String(req.query.to);
    const format = String(req.query.format ?? "json");

    const data = await financialStatementsService.incomeStatement(req.user!.tenantId, from, to);

    if (format === "pdf") {
      const buffer = await exportService.genericPdf({
        title: `Income Statement (${from} to ${to})`,
        rows: [
          { label: "Revenue", value: data.totals.totalRevenue },
          { label: "Cost", value: data.totals.totalCost },
          { label: "Gross Profit", value: data.totals.grossProfit },
          { label: "Expenses", value: data.totals.totalExpenses },
          { label: "Net Profit", value: data.totals.netProfit }
        ]
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=income-statement.pdf");
      res.status(200).send(buffer);
      return;
    }

    res.status(200).json(data);
  },

  async balanceSheet(req: Request, res: Response) {
    const asOf = String(req.query.asOf);
    const data = await financialStatementsService.balanceSheet(req.user!.tenantId, asOf);
    res.status(200).json(data);
  },

  async cashFlow(req: Request, res: Response) {
    const from = String(req.query.from);
    const to = String(req.query.to);
    const data = await financialStatementsService.cashFlowIndirect(req.user!.tenantId, from, to);
    res.status(200).json(data);
  },

  async trialBalance(req: Request, res: Response) {
    const from = String(req.query.from);
    const to = String(req.query.to);
    const format = String(req.query.format ?? "json");
    const template = String(req.query.template ?? "false") === "true";

    const data = template
      ? {
          from,
          to,
          lines: await accountingService.generateTrialBalanceTemplate(req.user!.tenantId),
          totals: { debit: 0, credit: 0 }
        }
      : await accountingService.generateTrialBalance({
          tenantId: req.user!.tenantId,
          from,
          to,
          createdBy: req.user!.userId
        });

    if (format === "excel") {
      const buffer = await exportService.trialBalanceExcel({
        from,
        to,
        templateMode: template,
        lines: data.lines
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=trial-balance.xlsx");
      res.status(200).send(buffer);
      return;
    }

    res.status(200).json(data);
  }
};
