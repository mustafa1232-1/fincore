import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional()
});

export const loginSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

export const setupSuggestSchema = z.object({
  activity: z.string().min(2)
});

export const setupCompleteSchema = z.object({
  companyName: z.string().min(2),
  activity: z.string().min(2),
  currency: z.string().length(3),
  country: z.string().min(2),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(8),
  selectedModules: z
    .array(
      z.enum([
        "accounting",
        "financial_statements",
        "budgeting",
        "forecasting",
        "inventory",
        "pos",
        "ai_assistant",
        "reports",
        "dashboard"
      ])
    )
    .optional(),
  accounts: z
    .array(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(["asset", "liability", "equity", "revenue", "expense", "cost"]),
        isSystem: z.boolean().optional()
      })
    )
    .optional(),
  warehouses: z.array(z.string().min(2)).optional()
});

export const moduleToggleSchema = z.object({
  enabled: z.boolean()
});

export const accountCreateSchema = z.object({
  parentId: z.string().uuid().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense", "cost"]),
  isSystem: z.boolean().optional()
});

export const accountUpdateSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense", "cost"])
});

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const journalCreateSchema = z.object({
  date: z.string().date(),
  description: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().uuid().optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().uuid(),
        debit: z.coerce.number().min(0),
        credit: z.coerce.number().min(0),
        description: z.string().optional()
      })
    )
    .min(1)
});

export const trialBalanceQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date()
});

export const trialBalanceImportSchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  postToLedger: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => (typeof value === "string" ? value === "true" : Boolean(value)))
});

export const financialReportQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  asOf: z.string().date().optional(),
  format: z.enum(["json", "pdf", "excel"]).optional()
});

export const budgetCalculateSchema = z.object({
  targetProfit: z.coerce.number(),
  costPercent: z.coerce.number().min(0).max(100),
  expensePercent: z.coerce.number().min(0).max(100),
  growthRate: z.coerce.number(),
  periodType: z.enum(["monthly", "quarterly", "semi_annual", "annual"]),
  periodStart: z.string().date(),
  periodEnd: z.string().date()
});

export const budgetCreateSchema = budgetCalculateSchema.extend({
  name: z.string().min(2)
});

export const forecastCreateSchema = z.object({
  name: z.string().min(2),
  periodType: z.enum(["monthly", "quarterly", "semi_annual", "annual"]),
  periods: z.coerce.number().int().min(1).max(60),
  startDate: z.string().date(),
  growthRate: z.coerce.number(),
  seasonality: z.array(z.coerce.number()).optional()
});

export const itemCreateSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0)
});

export const itemUpdateSchema = itemCreateSchema;

export const warehouseCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional()
});

export const stockMoveCreateSchema = z.object({
  itemId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  targetWarehouseId: z.string().uuid().optional(),
  moveType: z.enum(["purchase", "sale", "adjustment", "transfer"]),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  note: z.string().optional()
});

export const invoiceCreateSchema = z.object({
  type: z.enum(["sale", "purchase"]),
  customerName: z.string().optional(),
  invoiceDate: z.string().date(),
  taxAmount: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid().optional(),
        description: z.string().optional(),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0).optional()
      })
    )
    .min(1)
});

export const aiPromptSchema = z.object({
  message: z.string().min(2)
});

export const searchQuerySchema = z.object({
  q: z.string().min(1)
});
