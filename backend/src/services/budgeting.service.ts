import { financeRepository } from "../repositories/finance.repository";
import { AppError } from "../utils/errors";
import { addMonths, toIsoDate } from "../utils/dates";

const stepByPeriod: Record<"monthly" | "quarterly" | "semi_annual" | "annual", number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12
};

const round2 = (value: number): number => Number(value.toFixed(2));

const buildDistribution = (input: {
  periodType: "monthly" | "quarterly" | "semi_annual" | "annual";
  periodStart: string;
  periodEnd: string;
  requiredSales: number;
  projectedCost: number;
  projectedExpense: number;
  projectedProfit: number;
  growthRate: number;
}) => {
  const step = stepByPeriod[input.periodType];
  const start = new Date(input.periodStart);
  const end = new Date(input.periodEnd);

  const periods: Array<{
    period: string;
    sales: number;
    cost: number;
    expense: number;
    profit: number;
  }> = [];

  let cursor = start;

  while (cursor <= end) {
    periods.push({
      period: toIsoDate(cursor),
      sales: 0,
      cost: 0,
      expense: 0,
      profit: 0
    });

    cursor = addMonths(cursor, step);
  }

  const count = Math.max(periods.length, 1);

  for (let index = 0; index < periods.length; index += 1) {
    const factor = Math.pow(1 + input.growthRate / 100, index);

    periods[index].sales = round2((input.requiredSales / count) * factor);
    periods[index].cost = round2((input.projectedCost / count) * factor);
    periods[index].expense = round2((input.projectedExpense / count) * factor);
    periods[index].profit = round2((input.projectedProfit / count) * factor);
  }

  return periods;
};

export const budgetingService = {
  calculate(input: {
    targetProfit: number;
    costPercent: number;
    expensePercent: number;
    growthRate: number;
    periodType: "monthly" | "quarterly" | "semi_annual" | "annual";
    periodStart: string;
    periodEnd: string;
  }) {
    const costRatio = input.costPercent / 100;
    const expenseRatio = input.expensePercent / 100;
    const margin = 1 - costRatio - expenseRatio;

    if (margin <= 0) {
      throw new AppError("Invalid margin. Cost% + Expense% must be less than 100", 422);
    }

    const requiredSales = round2(input.targetProfit / margin);
    const projectedCost = round2(requiredSales * costRatio);
    const projectedExpense = round2(requiredSales * expenseRatio);
    const projectedProfit = round2(requiredSales - projectedCost - projectedExpense);

    const distribution = buildDistribution({
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      requiredSales,
      projectedCost,
      projectedExpense,
      projectedProfit,
      growthRate: input.growthRate
    });

    return {
      margin: round2(margin * 100),
      requiredSales,
      projectedCost,
      projectedExpense,
      projectedProfit,
      distribution
    };
  },

  async create(input: {
    tenantId: string;
    createdBy: string;
    name: string;
    targetProfit: number;
    costPercent: number;
    expensePercent: number;
    growthRate: number;
    periodType: "monthly" | "quarterly" | "semi_annual" | "annual";
    periodStart: string;
    periodEnd: string;
  }) {
    const calculation = this.calculate(input);

    const created = await financeRepository.createBudget({
      tenantId: input.tenantId,
      name: input.name,
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      targetProfit: input.targetProfit,
      costPercent: input.costPercent,
      expensePercent: input.expensePercent,
      growthRate: input.growthRate,
      requiredSales: calculation.requiredSales,
      projectedCost: calculation.projectedCost,
      projectedExpense: calculation.projectedExpense,
      projectedProfit: calculation.projectedProfit,
      distribution: calculation.distribution,
      createdBy: input.createdBy
    });

    return {
      id: created.id,
      ...calculation
    };
  },

  async list(tenantId: string) {
    return financeRepository.listBudgets(tenantId);
  }
};
