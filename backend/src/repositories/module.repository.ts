import { query } from "../database/pool";
import { ModuleKey } from "../models/common";

interface ModuleRow {
  key: ModuleKey;
  name: string;
  is_enabled: boolean | null;
}

export const moduleRepository = {
  async listTenantModules(tenantId: string): Promise<Array<{ key: ModuleKey; name: string; enabled: boolean }>> {
    const { rows } = await query<ModuleRow>(
      `
      SELECT m.key, m.name, tm.is_enabled
      FROM modules m
      LEFT JOIN tenant_modules tm
        ON tm.module_id = m.id
       AND tm.tenant_id = $1
      ORDER BY m.id
      `,
      [tenantId]
    );

    return rows.map((row) => ({ key: row.key, name: row.name, enabled: Boolean(row.is_enabled) }));
  },

  async toggleModule(tenantId: string, moduleKey: ModuleKey, enabled: boolean): Promise<void> {
    await query(
      `
      INSERT INTO tenant_modules (tenant_id, module_id, is_enabled)
      SELECT $1, m.id, $3
      FROM modules m
      WHERE m.key = $2
      ON CONFLICT (tenant_id, module_id)
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()
      `,
      [tenantId, moduleKey, enabled]
    );
  }
};
