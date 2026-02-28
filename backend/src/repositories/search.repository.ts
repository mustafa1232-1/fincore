import { query } from "../database/pool";

export const searchRepository = {
  async globalSearch(tenantId: string, q: string): Promise<{
    accounts: Array<{ id: string; code: string; name: string }>;
    journalEntries: Array<{ id: string; description: string | null; date: string }>;
    invoices: Array<{ id: string; invoice_number: string; customer_name: string | null }>;
    items: Array<{ id: string; name: string; sku: string | null }>;
    users: Array<{ id: string; name: string; email: string }>;
  }> {
    const like = `%${q}%`;

    const [accountsResult, journalResult, invoiceResult, itemResult, userResult] = await Promise.all([
      query<{ id: string; code: string; name: string }>(
        `
        SELECT id, code, name
        FROM accounts
        WHERE tenant_id = $1
          AND (code ILIKE $2 OR name ILIKE $2)
        ORDER BY code
        LIMIT 10
        `,
        [tenantId, like]
      ),
      query<{ id: string; description: string | null; date: string }>(
        `
        SELECT id, description, date::text
        FROM journal_entries
        WHERE tenant_id = $1
          AND (description ILIKE $2 OR id::text ILIKE $2)
        ORDER BY date DESC
        LIMIT 10
        `,
        [tenantId, like]
      ),
      query<{ id: string; invoice_number: string; customer_name: string | null }>(
        `
        SELECT id, invoice_number, customer_name
        FROM invoices
        WHERE tenant_id = $1
          AND (invoice_number ILIKE $2 OR COALESCE(customer_name, '') ILIKE $2)
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [tenantId, like]
      ),
      query<{ id: string; name: string; sku: string | null }>(
        `
        SELECT id, name, sku
        FROM items
        WHERE tenant_id = $1
          AND (name ILIKE $2 OR COALESCE(sku, '') ILIKE $2)
        ORDER BY name
        LIMIT 10
        `,
        [tenantId, like]
      ),
      query<{ id: string; name: string; email: string }>(
        `
        SELECT id, name, email
        FROM users
        WHERE tenant_id = $1
          AND (name ILIKE $2 OR email ILIKE $2)
        ORDER BY name
        LIMIT 10
        `,
        [tenantId, like]
      )
    ]);

    return {
      accounts: accountsResult.rows,
      journalEntries: journalResult.rows,
      invoices: invoiceResult.rows,
      items: itemResult.rows,
      users: userResult.rows
    };
  }
};
