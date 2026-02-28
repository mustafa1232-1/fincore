import { accountingRepository } from "../repositories/accounting.repository";
import { financeRepository } from "../repositories/finance.repository";
import { addMonths, toIsoDate } from "../utils/dates";

const stepByPeriod: Record<"monthly" | "quarterly" | "semi_annual" | "annual", number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12
};

const round2 = (value: number): number => Number(value.toFixed(2));

export const forecastingService = {
  async generate(input: {
    tenantId: string;
    createdBy: string;
    name: string;
    periodType: "monthly" | "quarterly" | "semi_annual" | "annual";
    periods: number;
    startDate: string;
    growthRate: number;
    seasonality?: number[];
  }) {
    const history = await accountingRepository.getMonthlyPnLHistory(input.tenantId, 12);

    const avgRevenue =
      history.length > 0
        ? history.reduce((sum, row) => sum + Number(row.revenue), 0) / history.length
        : 0;
    const avgCost =
      history.length > 0 ? history.reduce((sum, row) => sum + Number(row.cost), 0) / history.length : 0;
    const avgExpense =
      history.length > 0
        ? history.reduce((sum, row) => sum + Number(row.expense), 0) / history.length
        : 0;

    const seasonality = input.seasonality && input.seasonality.length > 0 ? input.seasonality : [1];
    const step = stepByPeriod[input.periodType];

    const start = new Date(input.startDate);

    const rows: Array<{
      period: string;
      salesForecast: number;
      costForecast: number;
      expenseForecast: number;
      profitForecast: number;
      growthApplied: number;
      seasonalityApplied: number;
    }> = [];

    for (let index = 0; index < input.periods; index += 1) {
      const periodDate = addMonths(start, index * step);
      const growthMultiplier = Math.pow(1 + input.growthRate / 100, index + 1);
      const seasonalityMultiplier = seasonality[index % seasonality.length] ?? 1;

      const salesForecast = round2(avgRevenue * growthMultiplier * seasonalityMultiplier);
      const costForecast = round2(avgCost * growthMultiplier * seasonalityMultiplier);
      const expenseForecast = round2(avgExpense * growthMultiplier * seasonalityMultiplier);
      const profitForecast = round2(salesForecast - costForecast - expenseForecast);

      rows.push({
        period: toIsoDate(periodDate),
        salesForecast,
        costForecast,
        expenseForecast,
        profitForecast,
        growthApplied: round2((growthMultiplier - 1) * 100),
        seasonalityApplied: seasonalityMultiplier
      });
    }

    const result = {
      baseline: {
        avgRevenue: round2(avgRevenue),
        avgCost: round2(avgCost),
        avgExpense: round2(avgExpense)
      },
      rows
    };

    const created = await financeRepository.createForecast({
      tenantId: input.tenantId,
      name: input.name,
      periodType: input.periodType,
      periods: input.periods,
      startDate: input.startDate,
      growthRate: input.growthRate,
      seasonality,
      result,
      createdBy: input.createdBy
    });

    return {
      id: created.id,
      ...result
    };
  },

  async list(tenantId: string) {
    return financeRepository.listForecasts(tenantId);
  }
};
