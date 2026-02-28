CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense', 'cost');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_type') THEN
    CREATE TYPE period_type AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_move_type') THEN
    CREATE TYPE stock_move_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type') THEN
    CREATE TYPE invoice_type AS ENUM ('sale', 'purchase');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'void');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  activity TEXT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role_key TEXT NOT NULL REFERENCES roles(key),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS modules (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_modules (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, module_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  role_key TEXT NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES modules(key) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT FALSE,
  can_write BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_key, module_key)
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  code VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  source_type TEXT,
  source_id UUID,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  description TEXT,
  debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (debit >= 0),
  CHECK (credit >= 0),
  CHECK ((debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0))
);

CREATE TABLE IF NOT EXISTS trial_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  totals JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_type period_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_profit NUMERIC(18, 2) NOT NULL,
  cost_percent NUMERIC(8, 4) NOT NULL,
  expense_percent NUMERIC(8, 4) NOT NULL,
  growth_rate NUMERIC(8, 4) NOT NULL,
  required_sales NUMERIC(18, 2) NOT NULL,
  projected_cost NUMERIC(18, 2) NOT NULL,
  projected_expense NUMERIC(18, 2) NOT NULL,
  projected_profit NUMERIC(18, 2) NOT NULL,
  distribution JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_type period_type NOT NULL,
  periods INT NOT NULL CHECK (periods > 0 AND periods <= 60),
  start_date DATE NOT NULL,
  growth_rate NUMERIC(8, 4) NOT NULL,
  seasonality JSONB,
  result JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  cost NUMERIC(18, 2) NOT NULL DEFAULT 0,
  price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  quantity_on_hand NUMERIC(18, 3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name),
  UNIQUE (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS stock_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  target_warehouse_id UUID REFERENCES warehouses(id),
  move_type stock_move_type NOT NULL,
  quantity NUMERIC(18, 3) NOT NULL,
  unit_cost NUMERIC(18, 2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  note TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  type invoice_type NOT NULL,
  status invoice_status NOT NULL DEFAULT 'issued',
  customer_name TEXT,
  invoice_date DATE NOT NULL,
  subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  description TEXT,
  quantity NUMERIC(18, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18, 2) NOT NULL,
  unit_cost NUMERIC(18, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'rule_engine_v1',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON journal_entries (tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_account ON journal_lines (tenant_id, account_id);
CREATE INDEX IF NOT EXISTS idx_trial_balances_tenant_period ON trial_balances (tenant_id, period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant_period ON budgets (tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_forecasts_tenant_start ON forecasts (tenant_id, start_date);
CREATE INDEX IF NOT EXISTS idx_items_tenant ON items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_tenant_created ON stock_moves (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_date ON invoices (tenant_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_tenant_created ON ai_logs (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created ON activity_logs (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id, tenant_id, revoked_at);

INSERT INTO roles (key, name)
VALUES
  ('admin', 'Admin'),
  ('accountant', 'Accountant'),
  ('manager', 'Manager'),
  ('viewer', 'Viewer')
ON CONFLICT (key) DO NOTHING;

INSERT INTO modules (key, name)
VALUES
  ('accounting', 'Accounting'),
  ('financial_statements', 'Financial Statements'),
  ('budgeting', 'Budgeting'),
  ('forecasting', 'Forecasting'),
  ('inventory', 'Inventory'),
  ('pos', 'POS'),
  ('ai_assistant', 'AI Assistant'),
  ('reports', 'Reports'),
  ('dashboard', 'Dashboard')
ON CONFLICT (key) DO NOTHING;

INSERT INTO permissions (role_key, module_key, can_read, can_write, can_delete)
SELECT role_key, module_key, can_read, can_write, can_delete
FROM (
  VALUES
    ('admin', 'accounting', TRUE, TRUE, TRUE),
    ('admin', 'financial_statements', TRUE, TRUE, TRUE),
    ('admin', 'budgeting', TRUE, TRUE, TRUE),
    ('admin', 'forecasting', TRUE, TRUE, TRUE),
    ('admin', 'inventory', TRUE, TRUE, TRUE),
    ('admin', 'pos', TRUE, TRUE, TRUE),
    ('admin', 'ai_assistant', TRUE, TRUE, TRUE),
    ('admin', 'reports', TRUE, TRUE, TRUE),
    ('admin', 'dashboard', TRUE, TRUE, TRUE),

    ('accountant', 'accounting', TRUE, TRUE, FALSE),
    ('accountant', 'financial_statements', TRUE, TRUE, FALSE),
    ('accountant', 'budgeting', TRUE, TRUE, FALSE),
    ('accountant', 'forecasting', TRUE, TRUE, FALSE),
    ('accountant', 'inventory', TRUE, TRUE, FALSE),
    ('accountant', 'pos', TRUE, TRUE, FALSE),
    ('accountant', 'ai_assistant', TRUE, TRUE, FALSE),
    ('accountant', 'reports', TRUE, TRUE, FALSE),
    ('accountant', 'dashboard', TRUE, TRUE, FALSE),

    ('manager', 'accounting', TRUE, FALSE, FALSE),
    ('manager', 'financial_statements', TRUE, FALSE, FALSE),
    ('manager', 'budgeting', TRUE, TRUE, FALSE),
    ('manager', 'forecasting', TRUE, TRUE, FALSE),
    ('manager', 'inventory', TRUE, FALSE, FALSE),
    ('manager', 'pos', TRUE, FALSE, FALSE),
    ('manager', 'ai_assistant', TRUE, TRUE, FALSE),
    ('manager', 'reports', TRUE, FALSE, FALSE),
    ('manager', 'dashboard', TRUE, FALSE, FALSE),

    ('viewer', 'accounting', TRUE, FALSE, FALSE),
    ('viewer', 'financial_statements', TRUE, FALSE, FALSE),
    ('viewer', 'budgeting', TRUE, FALSE, FALSE),
    ('viewer', 'forecasting', TRUE, FALSE, FALSE),
    ('viewer', 'inventory', TRUE, FALSE, FALSE),
    ('viewer', 'pos', TRUE, FALSE, FALSE),
    ('viewer', 'ai_assistant', TRUE, FALSE, FALSE),
    ('viewer', 'reports', TRUE, FALSE, FALSE),
    ('viewer', 'dashboard', TRUE, FALSE, FALSE)
) AS base(role_key, module_key, can_read, can_write, can_delete)
ON CONFLICT (role_key, module_key) DO NOTHING;
