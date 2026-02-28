export type RoleKey = "admin" | "accountant" | "manager" | "viewer";

export interface AuthUser {
  userId: string;
  tenantId: string;
  roleKey: RoleKey;
  email: string;
  name: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type ModuleKey =
  | "accounting"
  | "financial_statements"
  | "budgeting"
  | "forecasting"
  | "inventory"
  | "pos"
  | "ai_assistant"
  | "reports"
  | "dashboard";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense" | "cost";
