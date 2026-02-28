import { accountingRepository } from "../repositories/accounting.repository";

interface IncomeStatementLine {
  code: string;
  name: string;
  amount: number;
}

const round2 = (value: number): number => Number(value.toFixed(2));

export const financialStatementsService = {
  async incomeStatement(tenantId: string, from: string, to: string) {
    const rows = await accountingRepository.getIncomeStatementBreakdown(tenantId, from, to);

    const revenueLines: IncomeStatementLine[] = [];
    const costLines: IncomeStatementLine[] = [];
    const expenseLines: IncomeStatementLine[] = [];

    for (const row of rows) {
      const line = {
        code: row.code,
        name: row.name,
        amount: round2(Number(row.amount))
      };

      if (row.account_type === "revenue") {
        revenueLines.push(line);
      } else if (row.account_type === "cost") {
        costLines.push(line);
      } else if (row.account_type === "expense") {
        expenseLines.push(line);
      }
    }

    const totalRevenue = round2(revenueLines.reduce((sum, line) => sum + line.amount, 0));
    const totalCost = round2(costLines.reduce((sum, line) => sum + line.amount, 0));
    const grossProfit = round2(totalRevenue - totalCost);
    const totalExpenses = round2(expenseLines.reduce((sum, line) => sum + line.amount, 0));
    const netProfit = round2(grossProfit - totalExpenses);

    const grossMargin = totalRevenue === 0 ? 0 : round2((grossProfit / totalRevenue) * 100);
    const netMargin = totalRevenue === 0 ? 0 : round2((netProfit / totalRevenue) * 100);
    const expenseRatio = totalRevenue === 0 ? 0 : round2((totalExpenses / totalRevenue) * 100);
    const costRatio = totalRevenue === 0 ? 0 : round2((totalCost / totalRevenue) * 100);

    return {
      period: { from, to },
      revenue: revenueLines,
      cost: costLines,
      expenses: expenseLines,
      totals: {
        totalRevenue,
        totalCost,
        grossProfit,
        totalExpenses,
        netProfit,
        grossMargin,
        netMargin,
        expenseRatio,
        costRatio
      }
    };
  },

  async balanceSheet(tenantId: string, asOf: string) {
    const rows = await accountingRepository.getBalanceSheetBreakdown(tenantId, asOf);

    const assets: IncomeStatementLine[] = [];
    const liabilities: IncomeStatementLine[] = [];
    const equity: IncomeStatementLine[] = [];

    for (const row of rows) {
      const line = {
        code: row.code,
        name: row.name,
        amount: round2(Number(row.amount))
      };

      if (row.account_type === "asset") {
        assets.push(line);
      } else if (row.account_type === "liability") {
        liabilities.push(line);
      } else if (row.account_type === "equity") {
        equity.push(line);
      }
    }

    const totalAssets = round2(assets.reduce((sum, line) => sum + line.amount, 0));
    const totalLiabilities = round2(liabilities.reduce((sum, line) => sum + line.amount, 0));
    const totalEquity = round2(equity.reduce((sum, line) => sum + line.amount, 0));

    return {
      asOf,
      assets,
      liabilities,
      equity,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        liabilitiesAndEquity: round2(totalLiabilities + totalEquity),
        isBalanced: round2(totalAssets) === round2(totalLiabilities + totalEquity)
      }
    };
  },

  async cashFlowIndirect(tenantId: string, from: string, to: string) {
    const income = await this.incomeStatement(tenantId, from, to);

    const fromBalance = await accountingRepository.getBalanceSheetBreakdown(tenantId, from);
    const toBalance = await accountingRepository.getBalanceSheetBreakdown(tenantId, to);

    const deltaByKeyword = (keyword: string, type: "asset" | "liability") => {
      const start = fromBalance
        .filter((line) => line.account_type === type && line.name.toLowerCase().includes(keyword))
        .reduce((sum, line) => sum + Number(line.amount), 0);
      const end = toBalance
        .filter((line) => line.account_type === type && line.name.toLowerCase().includes(keyword))
        .reduce((sum, line) => sum + Number(line.amount), 0);

      return round2(end - start);
    };

    const receivablesDelta = deltaByKeyword("receivable", "asset");
    const inventoryDelta = deltaByKeyword("inventory", "asset");
    const payablesDelta = deltaByKeyword("payable", "liability");

    const workingCapitalChange = round2((-receivablesDelta) + (-inventoryDelta) + payablesDelta);
    const operatingCashFlow = round2(income.totals.netProfit + workingCapitalChange);

    return {
      period: { from, to },
      netIncome: income.totals.netProfit,
      adjustments: {
        nonCashAdjustments: 0,
        receivablesDelta,
        inventoryDelta,
        payablesDelta,
        workingCapitalChange
      },
      operatingCashFlow
    };
  }
};
