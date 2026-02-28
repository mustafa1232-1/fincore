import { PoolClient } from "pg";
import { query, withTransaction } from "../database/pool";
import { AccountType, ModuleKey } from "../models/common";

interface CreateTenantParams {
  companyName: string;
  activity: string;
  currency: string;
  country: string;
  adminEmail: string;
  adminName: string;
  passwordHash: string;
  selectedModules: ModuleKey[];
  accounts: Array<{ code: string; name: string; type: AccountType; isSystem?: boolean }>;
  warehouses: string[];
}

interface TenantUserResult {
  tenantId: string;
  userId: string;
}

const enableModules = async (client: PoolClient, tenantId: string, keys: ModuleKey[]): Promise<void> => {
  if (keys.length === 0) {
    return;
  }

  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM modules WHERE key = ANY($1::text[])`,
    [keys]
  );

  for (const row of rows) {
    await client.query(
      `
      INSERT INTO tenant_modules (tenant_id, module_id, is_enabled)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (tenant_id, module_id)
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()
      `,
      [tenantId, row.id]
    );
  }
};

const insertAccounts = async (
  client: PoolClient,
  tenantId: string,
  accounts: Array<{ code: string; name: string; type: AccountType; isSystem?: boolean }>
): Promise<void> => {
  for (const account of accounts) {
    await client.query(
      `
      INSERT INTO accounts (tenant_id, code, name, type, is_system)
      VALUES ($1, $2, $3, $4::account_type, $5)
      ON CONFLICT (tenant_id, code)
      DO NOTHING
      `,
      [tenantId, account.code, account.name, account.type, account.isSystem ?? false]
    );
  }
};

const insertWarehouses = async (client: PoolClient, tenantId: string, warehouses: string[]): Promise<void> => {
  for (const warehouseName of warehouses) {
    await client.query(
      `
      INSERT INTO warehouses (tenant_id, name)
      VALUES ($1, $2)
      ON CONFLICT (tenant_id, name)
      DO NOTHING
      `,
      [tenantId, warehouseName]
    );
  }
};

export const setupRepository = {
  async createTenantWithAdmin(input: CreateTenantParams): Promise<TenantUserResult> {
    return withTransaction(async (client) => {
      const tenantResult = await client.query<{ id: string }>(
        `
        INSERT INTO tenants (name, activity, currency, country)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [input.companyName, input.activity, input.currency, input.country]
      );

      const tenantId = tenantResult.rows[0].id;

      const userResult = await client.query<{ id: string }>(
        `
        INSERT INTO users (tenant_id, email, password_hash, name, role_key)
        VALUES ($1, LOWER($2), $3, $4, 'admin')
        RETURNING id
        `,
        [tenantId, input.adminEmail, input.passwordHash, input.adminName]
      );

      const userId = userResult.rows[0].id;

      await enableModules(client, tenantId, input.selectedModules);
      await insertAccounts(client, tenantId, input.accounts);
      await insertWarehouses(client, tenantId, input.warehouses);

      await client.query(
        `
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
        VALUES ($1, $2, 'setup_completed', 'tenant', $1, $3::jsonb)
        `,
        [tenantId, userId, JSON.stringify({ modules: input.selectedModules })]
      );

      return { tenantId, userId };
    });
  },

  async getTenantById(tenantId: string): Promise<{ id: string; name: string; activity: string } | null> {
    const { rows } = await query<{ id: string; name: string; activity: string }>(
      `SELECT id, name, activity FROM tenants WHERE id = $1 LIMIT 1`,
      [tenantId]
    );

    return rows[0] ?? null;
  }
};
