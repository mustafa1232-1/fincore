import { accountingRepository } from "../repositories/accounting.repository";
import { financeRepository } from "../repositories/finance.repository";

const round2 = (value: number): number => Number(value.toFixed(2));

export const dashboardService = {
  async overview(tenantId: string) {
    const totals = await financeRepository.getDashboardTotals(tenantId);
    const history = await accountingRepository.getMonthlyPnLHistory(tenantId, 6);

    const last = history.at(-1);
    const previous = history.at(-2);

    const growth = (() => {
      if (!last || !previous) {
        return 0;
      }

      const prevRevenue = Number(previous.revenue);
      const currentRevenue = Number(last.revenue);

      if (prevRevenue === 0) {
        return currentRevenue > 0 ? 100 : 0;
      }

      return round2(((currentRevenue - prevRevenue) / prevRevenue) * 100);
    })();

    const insights = [
      {
        key: "revenue",
        title: "Revenue",
        value: round2(totals.revenue),
        targetRoute: "/reports/income-statement"
      },
      {
        key: "profit",
        title: "Profit",
        value: round2(totals.profit),
        targetRoute: "/reports/income-statement"
      },
      {
        key: "expenses",
        title: "Expenses",
        value: round2(totals.expense),
        targetRoute: "/reports/expense-analysis"
      },
      {
        key: "growth",
        title: "Growth",
        value: growth,
        targetRoute: "/reports/sales-trend"
      }
    ];

    return {
      kpis: {
        revenue: round2(totals.revenue),
        cost: round2(totals.cost),
        expense: round2(totals.expense),
        profit: round2(totals.profit),
        growth
      },
      history: history.map((row) => ({
        month: row.month,
        revenue: round2(Number(row.revenue)),
        cost: round2(Number(row.cost)),
        expense: round2(Number(row.expense)),
        profit: round2(Number(row.profit))
      })),
      insightCards: insights
    };
  }
};
