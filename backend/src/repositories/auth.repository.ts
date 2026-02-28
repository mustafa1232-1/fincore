import { query } from "../database/pool";

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  role_key: "admin" | "accountant" | "manager" | "viewer";
  is_active: boolean;
}

export const authRepository = {
  async findUserByTenantAndEmail(tenantId: string, email: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>(
      `
      SELECT id, tenant_id, email, password_hash, name, role_key, is_active
      FROM users
      WHERE tenant_id = $1 AND LOWER(email) = LOWER($2)
      LIMIT 1
      `,
      [tenantId, email]
    );

    return rows[0] ?? null;
  },

  async findUserById(tenantId: string, userId: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>(
      `
      SELECT id, tenant_id, email, password_hash, name, role_key, is_active
      FROM users
      WHERE tenant_id = $1 AND id = $2
      LIMIT 1
      `,
      [tenantId, userId]
    );

    return rows[0] ?? null;
  },

  async insertRefreshToken(
    userId: string,
    tenantId: string,
    tokenHash: string,
    expiresAtIso: string
  ): Promise<void> {
    await query(
      `
      INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4::timestamptz)
      `,
      [userId, tenantId, tokenHash, expiresAtIso]
    );
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await query(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
        AND revoked_at IS NULL
      `,
      [tokenHash]
    );
  },

  async validateRefreshToken(tokenHash: string): Promise<{ userId: string; tenantId: string } | null> {
    const { rows } = await query<{ user_id: string; tenant_id: string }>(
      `
      SELECT user_id, tenant_id
      FROM refresh_tokens
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [tokenHash]
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      userId: row.user_id,
      tenantId: row.tenant_id
    };
  }
};
