import { query } from "../database/pool";

export const financeRepository = {
  async createBudget(input: {
    tenantId: string;
    name: string;
    periodType: "monthly" | "quarterly" | "semi_annual" | "annual";
    periodStart: string;
    periodEnd: string;
    targetProfit: number;
    costPercent: number;
    expensePercent: number;
    growthRate: number;
    requiredSales: number;
    projectedCost: number;
    projectedExpense: number;
    projectedProfit: number;
    distribution: unknown;
    createdBy: string;
  }): Promise<{ id: string }> {
    const { rows } = await query<{ id: string }>(
      `
      INSERT INTO budgets (
        tenant_id, name, period_type, period_start, period_end,
        target_profit, cost_percent, expense_percent, growth_rate,
        required_sales, projected_cost, projected_expense, projected_profit,
        distribution, created_by
      )
      VALUES (
        $1, $2, $3::period_type, $4::date, $5::date,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14::jsonb, $15
      )
      RETURNING id
      `,
      [
        input.tenantId,
        input.name,
        input.periodType,
        input.periodStart,
        input.periodEnd,
        input.targetProfit,
        input.costPercent,
        input.expensePercent,
        input.growthRate,
        input.requiredSales,
        input.projectedCost,
        input.projectedExpense,
        input.projectedProfit,
        JSON.stringify(input.distribution),
        input.createdBy
      ]
    );

    return rows[0];
  },

  async listBudgets(tenantId: string): Promise<Array<{
    id: string;
    name: string;
    period_type: string;
    period_start: string;
    period_end: string;
    target_profit: string;
    required_sales: string;
    projected_profit: string;
    created_at: string;
  }>> {
    const { rows } = await query<{
      id: string;
      name: string;
      period_type: string;
      period_start: string;
      period_end: string;
      target_profit: string;
      required_sales: string;
      projected_profit: string;
      created_at: string;
    }>(
      `
      SELECT
        id,
        name,
        period_type::text,
        period_start::text,
        period_end::text,
        target_profit::text,
        required_sales::text,
        projected_profit::text,
        created_at::text
      FROM budgets
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [tenantId]
    );

    return rows;
  },

  async createForecast(input: {
    tenantId: string;
    name: string;
    periodType: "monthly" | "quarterly" | "semi_annual" | "annual";
    periods: number;
    startDate: string;
    growthRate: number;
    seasonality?: unknown;
    result: unknown;
    createdBy: string;
  }): Promise<{ id: string }> {
    const { rows } = await query<{ id: string }>(
      `
      INSERT INTO forecasts (
        tenant_id, name, period_type, periods, start_date,
        growth_rate, seasonality, result, created_by
      )
      VALUES (
        $1, $2, $3::period_type, $4, $5::date,
        $6, $7::jsonb, $8::jsonb, $9
      )
      RETURNING id
      `,
      [
        input.tenantId,
        input.name,
        input.periodType,
        input.periods,
        input.startDate,
        input.growthRate,
        input.seasonality ? JSON.stringify(input.seasonality) : null,
        JSON.stringify(input.result),
        input.createdBy
      ]
    );

    return rows[0];
  },

  async listForecasts(tenantId: string): Promise<Array<{
    id: string;
    name: string;
    period_type: string;
    periods: number;
    start_date: string;
    growth_rate: string;
    created_at: string;
    result: unknown;
  }>> {
    const { rows } = await query<{
      id: string;
      name: string;
      period_type: string;
      periods: number;
      start_date: string;
      growth_rate: string;
      created_at: string;
      result: unknown;
    }>(
      `
      SELECT
        id,
        name,
        period_type::text,
        periods,
        start_date::text,
        growth_rate::text,
        created_at::text,
        result
      FROM forecasts
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [tenantId]
    );

    return rows;
  },

  async getDashboardTotals(tenantId: string): Promise<{
    revenue: number;
    cost: number;
    expense: number;
    profit: number;
  }> {
    const { rows } = await query<{
      revenue: string;
      cost: string;
      expense: string;
    }>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN (jl.credit - jl.debit) ELSE 0 END), 0)::text AS revenue,
        COALESCE(SUM(CASE WHEN a.type = 'cost' THEN (jl.debit - jl.credit) ELSE 0 END), 0)::text AS cost,
        COALESCE(SUM(CASE WHEN a.type = 'expense' THEN (jl.debit - jl.credit) ELSE 0 END), 0)::text AS expense
      FROM journal_entries je
      INNER JOIN journal_lines jl ON jl.entry_id = je.id
      INNER JOIN accounts a ON a.id = jl.account_id AND a.tenant_id = je.tenant_id
      WHERE je.tenant_id = $1
      `,
      [tenantId]
    );

    const row = rows[0] ?? { revenue: "0", cost: "0", expense: "0" };
    const revenue = Number(row.revenue);
    const cost = Number(row.cost);
    const expense = Number(row.expense);

    return {
      revenue,
      cost,
      expense,
      profit: revenue - cost - expense
    };
  }
};
