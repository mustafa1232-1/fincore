import { query, withTransaction } from "../database/pool";
import { AccountType } from "../models/common";

export interface AccountEntity {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  type: AccountType;
  is_system: boolean;
}

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryInput {
  tenantId: string;
  date: string;
  description?: string;
  createdBy: string;
  sourceType?: string;
  sourceId?: string;
  lines: JournalLineInput[];
}

export const accountingRepository = {
  async listAccounts(tenantId: string): Promise<AccountEntity[]> {
    const { rows } = await query<AccountEntity>(
      `
      SELECT id, tenant_id, parent_id, code, name, type, is_system
      FROM accounts
      WHERE tenant_id = $1
      ORDER BY code ASC
      `,
      [tenantId]
    );

    return rows;
  },

  async getAccountById(tenantId: string, accountId: string): Promise<AccountEntity | null> {
    const { rows } = await query<AccountEntity>(
      `
      SELECT id, tenant_id, parent_id, code, name, type, is_system
      FROM accounts
      WHERE tenant_id = $1 AND id = $2
      LIMIT 1
      `,
      [tenantId, accountId]
    );

    return rows[0] ?? null;
  },

  async findAccountByCode(tenantId: string, code: string): Promise<AccountEntity | null> {
    const { rows } = await query<AccountEntity>(
      `
      SELECT id, tenant_id, parent_id, code, name, type, is_system
      FROM accounts
      WHERE tenant_id = $1 AND code = $2
      LIMIT 1
      `,
      [tenantId, code]
    );

    return rows[0] ?? null;
  },

  async findAccountByName(tenantId: string, name: string): Promise<AccountEntity | null> {
    const { rows } = await query<AccountEntity>(
      `
      SELECT id, tenant_id, parent_id, code, name, type, is_system
      FROM accounts
      WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)
      LIMIT 1
      `,
      [tenantId, name]
    );

    return rows[0] ?? null;
  },

  async createAccount(input: {
    tenantId: string;
    parentId?: string | null;
    code: string;
    name: string;
    type: AccountType;
    isSystem?: boolean;
  }): Promise<AccountEntity> {
    const { rows } = await query<AccountEntity>(
      `
      INSERT INTO accounts (tenant_id, parent_id, code, name, type, is_system)
      VALUES ($1, $2, $3, $4, $5::account_type, $6)
      RETURNING id, tenant_id, parent_id, code, name, type, is_system
      `,
      [input.tenantId, input.parentId ?? null, input.code, input.name, input.type, input.isSystem ?? false]
    );

    return rows[0];
  },

  async updateAccount(input: {
    tenantId: string;
    accountId: string;
    parentId?: string | null;
    code: string;
    name: string;
    type: AccountType;
  }): Promise<AccountEntity | null> {
    const { rows } = await query<AccountEntity>(
      `
      UPDATE accounts
      SET parent_id = $3,
          code = $4,
          name = $5,
          type = $6::account_type,
          updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
      RETURNING id, tenant_id, parent_id, code, name, type, is_system
      `,
      [input.tenantId, input.accountId, input.parentId ?? null, input.code, input.name, input.type]
    );

    return rows[0] ?? null;
  },

  async deleteAccount(tenantId: string, accountId: string): Promise<void> {
    await query(`DELETE FROM accounts WHERE tenant_id = $1 AND id = $2`, [tenantId, accountId]);
  },

  async hasAccountChildren(tenantId: string, accountId: string): Promise<boolean> {
    const { rowCount } = await query(
      `SELECT 1 FROM accounts WHERE tenant_id = $1 AND parent_id = $2 LIMIT 1`,
      [tenantId, accountId]
    );

    return (rowCount ?? 0) > 0;
  },

  async hasAccountJournalLines(tenantId: string, accountId: string): Promise<boolean> {
    const { rowCount } = await query(
      `SELECT 1 FROM journal_lines WHERE tenant_id = $1 AND account_id = $2 LIMIT 1`,
      [tenantId, accountId]
    );

    return (rowCount ?? 0) > 0;
  },

  async createJournalEntry(input: JournalEntryInput): Promise<{ entryId: string }> {
    return withTransaction(async (client) => {
      const entryResult = await client.query<{ id: string }>(
        `
        INSERT INTO journal_entries (tenant_id, date, description, source_type, source_id, created_by)
        VALUES ($1, $2::date, $3, $4, $5, $6)
        RETURNING id
        `,
        [input.tenantId, input.date, input.description ?? null, input.sourceType ?? null, input.sourceId ?? null, input.createdBy]
      );

      const entryId = entryResult.rows[0].id;

      for (const line of input.lines) {
        await client.query(
          `
          INSERT INTO journal_lines (tenant_id, entry_id, account_id, debit, credit, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [input.tenantId, entryId, line.accountId, line.debit, line.credit, line.description ?? null]
        );
      }

      await client.query(
        `
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
        VALUES ($1, $2, 'journal_entry_created', 'journal_entries', $3, $4::jsonb)
        `,
        [input.tenantId, input.createdBy, entryId, JSON.stringify({ lineCount: input.lines.length })]
      );

      return { entryId };
    });
  },

  async listJournalEntries(
    tenantId: string,
    limit: number,
    offset: number
  ): Promise<
    Array<{
      id: string;
      date: string;
      description: string | null;
      created_at: string;
      created_by: string;
      total_debit: string;
      total_credit: string;
    }>
  > {
    const { rows } = await query<{
      id: string;
      date: string;
      description: string | null;
      created_at: string;
      created_by: string;
      total_debit: string;
      total_credit: string;
    }>(
      `
      SELECT
        je.id,
        je.date::text,
        je.description,
        je.created_at::text,
        je.created_by::text,
        COALESCE(SUM(jl.debit), 0)::text AS total_debit,
        COALESCE(SUM(jl.credit), 0)::text AS total_credit
      FROM journal_entries je
      LEFT JOIN journal_lines jl
        ON jl.entry_id = je.id
      WHERE je.tenant_id = $1
      GROUP BY je.id
      ORDER BY je.date DESC, je.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [tenantId, limit, offset]
    );

    return rows;
  },

  async getJournalEntryLines(tenantId: string, entryId: string): Promise<Array<{
    account_id: string;
    account_code: string;
    account_name: string;
    debit: string;
    credit: string;
    description: string | null;
  }>> {
    const { rows } = await query<{
      account_id: string;
      account_code: string;
      account_name: string;
      debit: string;
      credit: string;
      description: string | null;
    }>(
      `
      SELECT
        jl.account_id,
        a.code AS account_code,
        a.name AS account_name,
        jl.debit::text,
        jl.credit::text,
        jl.description
      FROM journal_lines jl
      INNER JOIN accounts a
        ON a.id = jl.account_id
      WHERE jl.tenant_id = $1
        AND jl.entry_id = $2
      ORDER BY a.code ASC
      `,
      [tenantId, entryId]
    );

    return rows;
  },

  async getTrialBalance(tenantId: string, from: string, to: string): Promise<Array<{
    account_id: string;
    code: string;
    name: string;
    debit: string;
    credit: string;
    balance: string;
    type: AccountType;
  }>> {
    const { rows } = await query<{
      account_id: string;
      code: string;
      name: string;
      debit: string;
      credit: string;
      balance: string;
      type: AccountType;
    }>(
      `
      SELECT
        a.id AS account_id,
        a.code,
        a.name,
        a.type,
        COALESCE(SUM(jl.debit), 0)::text AS debit,
        COALESCE(SUM(jl.credit), 0)::text AS credit,
        (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))::text AS balance
      FROM accounts a
      LEFT JOIN journal_lines jl
        ON jl.account_id = a.id
       AND jl.tenant_id = a.tenant_id
      LEFT JOIN journal_entries je
        ON je.id = jl.entry_id
       AND je.tenant_id = a.tenant_id
       AND je.date >= $2::date
       AND je.date <= $3::date
      WHERE a.tenant_id = $1
      GROUP BY a.id
      ORDER BY a.code ASC
      `,
      [tenantId, from, to]
    );

    return rows;
  },

  async storeTrialBalanceSnapshot(input: {
    tenantId: string;
    from: string;
    to: string;
    source: string;
    createdBy: string;
    totals: unknown;
  }): Promise<void> {
    await query(
      `
      INSERT INTO trial_balances (tenant_id, period_from, period_to, source, totals, created_by)
      VALUES ($1, $2::date, $3::date, $4, $5::jsonb, $6)
      `,
      [input.tenantId, input.from, input.to, input.source, JSON.stringify(input.totals), input.createdBy]
    );
  },

  async getIncomeStatementBreakdown(tenantId: string, from: string, to: string): Promise<Array<{
    account_type: AccountType;
    code: string;
    name: string;
    amount: string;
  }>> {
    const { rows } = await query<{
      account_type: AccountType;
      code: string;
      name: string;
      amount: string;
    }>(
      `
      SELECT
        a.type AS account_type,
        a.code,
        a.name,
        CASE
          WHEN a.type = 'revenue' THEN (COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0))::text
          ELSE (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))::text
        END AS amount
      FROM accounts a
      LEFT JOIN journal_lines jl
        ON jl.account_id = a.id
       AND jl.tenant_id = a.tenant_id
      LEFT JOIN journal_entries je
        ON je.id = jl.entry_id
       AND je.tenant_id = a.tenant_id
       AND je.date >= $2::date
       AND je.date <= $3::date
      WHERE a.tenant_id = $1
        AND a.type IN ('revenue', 'cost', 'expense')
      GROUP BY a.id
      ORDER BY a.code ASC
      `,
      [tenantId, from, to]
    );

    return rows;
  },

  async getBalanceSheetBreakdown(tenantId: string, asOf: string): Promise<Array<{
    account_type: AccountType;
    code: string;
    name: string;
    amount: string;
  }>> {
    const { rows } = await query<{
      account_type: AccountType;
      code: string;
      name: string;
      amount: string;
    }>(
      `
      SELECT
        a.type AS account_type,
        a.code,
        a.name,
        CASE
          WHEN a.type IN ('asset', 'expense', 'cost')
            THEN (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))::text
          ELSE (COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0))::text
        END AS amount
      FROM accounts a
      LEFT JOIN journal_lines jl
        ON jl.account_id = a.id
       AND jl.tenant_id = a.tenant_id
      LEFT JOIN journal_entries je
        ON je.id = jl.entry_id
       AND je.tenant_id = a.tenant_id
       AND je.date <= $2::date
      WHERE a.tenant_id = $1
        AND a.type IN ('asset', 'liability', 'equity')
      GROUP BY a.id
      ORDER BY a.code ASC
      `,
      [tenantId, asOf]
    );

    return rows;
  },

  async getMonthlyPnLHistory(
    tenantId: string,
    months: number
  ): Promise<Array<{ month: string; revenue: string; cost: string; expense: string; profit: string }>> {
    const { rows } = await query<{ month: string; revenue: string; cost: string; expense: string; profit: string }>(
      `
      WITH monthly AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', je.date), 'YYYY-MM') AS month,
          SUM(CASE WHEN a.type = 'revenue' THEN (jl.credit - jl.debit) ELSE 0 END) AS revenue,
          SUM(CASE WHEN a.type = 'cost' THEN (jl.debit - jl.credit) ELSE 0 END) AS cost,
          SUM(CASE WHEN a.type = 'expense' THEN (jl.debit - jl.credit) ELSE 0 END) AS expense
        FROM journal_entries je
        INNER JOIN journal_lines jl
          ON jl.entry_id = je.id
        INNER JOIN accounts a
          ON a.id = jl.account_id
         AND a.tenant_id = je.tenant_id
        WHERE je.tenant_id = $1
          AND je.date >= DATE_TRUNC('month', CURRENT_DATE) - (($2 - 1) || ' month')::interval
        GROUP BY DATE_TRUNC('month', je.date)
      )
      SELECT
        month,
        COALESCE(revenue, 0)::text AS revenue,
        COALESCE(cost, 0)::text AS cost,
        COALESCE(expense, 0)::text AS expense,
        (COALESCE(revenue, 0) - COALESCE(cost, 0) - COALESCE(expense, 0))::text AS profit
      FROM monthly
      ORDER BY month ASC
      `,
      [tenantId, months]
    );

    return rows;
  }
};
