import { aiRepository } from "../repositories/ai.repository";
import { financeRepository } from "../repositories/finance.repository";
import { financialStatementsService } from "./financial-statements.service";

const round2 = (value: number): number => Number(value.toFixed(2));

const extractFirstNumber = (text: string): number | null => {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const extractPercent = (text: string): number | null => {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
};

const buildRecommendations = (input: {
  grossMargin: number;
  netMargin: number;
  expenseRatio: number;
  costRatio: number;
  netProfit: number;
}) => {
  const recommendations: string[] = [];

  if (input.expenseRatio > 35) {
    recommendations.push("???????? ????????? ??????? ???? ??????? ???? ??????? ??? ???????? ???? ??? ?????.");
  }

  if (input.costRatio > 70) {
    recommendations.push("????? ?????? ?????? ?????????? ????? ??? ????????? ?? ???? ???????.");
  }

  if (input.grossMargin < 25) {
    recommendations.push("???? ????? ???????? ?????? ???? ???? ??????? ??????? ??????? ?????.");
  }

  if (input.netProfit < 0) {
    recommendations.push("?????? ???? ????? ?????? ??????? ??? ???????? ?? ??? ????? ????????? ?????.");
  }

  if (recommendations.length === 0) {
    recommendations.push("?????? ?????? ????? ??????? ????? ??????? ????????? ??????? ?????? ????????.");
  }

  return recommendations;
};

export const aiAssistantService = {
  async ask(input: { tenantId: string; userId: string; message: string }) {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const income = await financialStatementsService.incomeStatement(input.tenantId, from, to);
    const totals = await financeRepository.getDashboardTotals(input.tenantId);

    const targetProfit = extractFirstNumber(input.message);
    const explicitMargin = extractPercent(input.message);
    const derivedMargin = income.totals.netMargin > 0 ? income.totals.netMargin : 20;
    const usedMargin = explicitMargin ?? derivedMargin;

    const recommendations = buildRecommendations({
      grossMargin: income.totals.grossMargin,
      netMargin: income.totals.netMargin,
      expenseRatio: income.totals.expenseRatio,
      costRatio: income.totals.costRatio,
      netProfit: income.totals.netProfit
    });

    let requiredSales: number | null = null;
    let projectedCost: number | null = null;
    let projectedProfit: number | null = null;

    if (targetProfit && usedMargin > 0) {
      requiredSales = round2(targetProfit / (usedMargin / 100));
      projectedCost = round2(requiredSales * (income.totals.costRatio / 100));
      projectedProfit = round2(targetProfit);
    }

    const responsePayload = {
      summary: {
        revenue: round2(totals.revenue),
        cost: round2(totals.cost),
        expense: round2(totals.expense),
        profit: round2(totals.profit),
        grossMargin: income.totals.grossMargin,
        netMargin: income.totals.netMargin,
        expenseRatio: income.totals.expenseRatio,
        costRatio: income.totals.costRatio
      },
      targetAnalysis: targetProfit
        ? {
            targetProfit: round2(targetProfit),
            marginUsed: round2(usedMargin),
            requiredSales,
            projectedCost,
            projectedProfit
          }
        : null,
      recommendations
    };

    const arabicText = targetProfit
      ? `?????? ??? ${round2(targetProfit)}, ?????? ??? ???? ${round2(usedMargin)}%? ????? ?????? ??????? ${requiredSales}. ????????: ${recommendations.join(" | ")}`
      : `????? ?????? ??????: ??????? ${round2(totals.revenue)} ?????? ${round2(totals.profit)}. ????????: ${recommendations.join(" | ")}`;

    await aiRepository.logInteraction({
      tenantId: input.tenantId,
      userId: input.userId,
      prompt: input.message,
      response: arabicText,
      model: "rule_engine_v1",
      metadata: responsePayload
    });

    return {
      answer: arabicText,
      data: responsePayload
    };
  }
};
