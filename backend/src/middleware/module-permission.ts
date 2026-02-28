import { NextFunction, Request, Response } from "express";
import { ModuleKey } from "../models/common";
import { query } from "../database/pool";
import { ForbiddenError } from "../utils/errors";

export type PermissionAction = "read" | "write" | "delete";

const actionToColumn: Record<PermissionAction, string> = {
  read: "can_read",
  write: "can_write",
  delete: "can_delete"
};

export const requireModulePermission = (moduleKey: ModuleKey, action: PermissionAction) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new ForbiddenError("Authentication required"));
      return;
    }

    const permissionColumn = actionToColumn[action];

    const sql = `
      SELECT
        tm.is_enabled,
        COALESCE(p.${permissionColumn}, false) AS allowed
      FROM modules m
      LEFT JOIN tenant_modules tm
        ON tm.module_id = m.id
       AND tm.tenant_id = $1
      LEFT JOIN permissions p
        ON p.module_key = m.key
       AND p.role_key = $2
      WHERE m.key = $3
      LIMIT 1
    `;

    const { rows } = await query<{ is_enabled: boolean | null; allowed: boolean }>(sql, [
      req.user.tenantId,
      req.user.roleKey,
      moduleKey
    ]);

    const row = rows[0];

    if (!row?.is_enabled) {
      next(new ForbiddenError(`Module '${moduleKey}' is disabled`));
      return;
    }

    if (!row.allowed) {
      next(new ForbiddenError(`Permission denied for ${action} on '${moduleKey}'`));
      return;
    }

    next();
  };
};
