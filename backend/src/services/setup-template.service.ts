import { AccountType, ModuleKey } from "../models/common";

interface AccountTemplate {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  isSystem?: boolean;
}

interface ActivityTemplate {
  modules: ModuleKey[];
  warehouses: string[];
  expenseCategories: string[];
  costCategories: string[];
  revenueStreams: string[];
  accounts: AccountTemplate[];
}

const baseAccounts: AccountTemplate[] = [
  { code: "1000", name: "Cash", type: "asset", isSystem: true },
  { code: "1100", name: "Accounts Receivable", type: "asset", isSystem: true },
  { code: "1200", name: "Inventory", type: "asset", isSystem: true },
  { code: "1300", name: "Prepaid Expenses", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "Accrued Expenses", type: "liability" },
  { code: "3000", name: "Owner Equity", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "revenue", isSystem: true },
  { code: "4100", name: "Service Revenue", type: "revenue" },
  { code: "5000", name: "Cost of Sales", type: "cost", isSystem: true },
  { code: "5100", name: "Direct Labor Cost", type: "cost" },
  { code: "6000", name: "Operating Expenses", type: "expense" },
  { code: "6100", name: "Rent Expense", type: "expense" },
  { code: "6200", name: "Salaries Expense", type: "expense" },
  { code: "6300", name: "Utilities Expense", type: "expense" },
  { code: "6400", name: "Marketing Expense", type: "expense" }
];

const defaultModules: ModuleKey[] = [
  "accounting",
  "financial_statements",
  "budgeting",
  "forecasting",
  "reports",
  "dashboard",
  "ai_assistant"
];

const templates: Record<string, ActivityTemplate> = {
  supermarket: {
    modules: [...defaultModules, "inventory", "pos"],
    warehouses: ["Main Warehouse", "Cold Storage"],
    expenseCategories: ["Staff", "Rent", "Utilities", "Logistics"],
    costCategories: ["Purchases", "Freight", "Waste"],
    revenueStreams: ["Retail Sales", "Wholesale Sales"],
    accounts: [...baseAccounts]
  },
  pharmacy: {
    modules: [...defaultModules, "inventory", "pos"],
    warehouses: ["Medicine Warehouse", "Temperature-Controlled Room"],
    expenseCategories: ["Pharmacist Salaries", "Licensing", "Utilities"],
    costCategories: ["Medicine Purchases", "Expired Stock"],
    revenueStreams: ["Prescription Sales", "OTC Sales"],
    accounts: [...baseAccounts]
  },
  restaurant: {
    modules: [...defaultModules, "inventory", "pos"],
    warehouses: ["Food Storage", "Beverage Storage"],
    expenseCategories: ["Staff", "Rent", "Utilities", "Delivery"],
    costCategories: ["Ingredients", "Packaging", "Kitchen Supplies"],
    revenueStreams: ["Dine-in", "Delivery", "Catering"],
    accounts: [...baseAccounts]
  },
  factory: {
    modules: [...defaultModules, "inventory"],
    warehouses: ["Raw Materials Warehouse", "Finished Goods Warehouse"],
    expenseCategories: ["Admin", "Utilities", "Maintenance"],
    costCategories: ["Raw Materials", "Direct Labor", "Overhead"],
    revenueStreams: ["Product Sales"],
    accounts: [...baseAccounts]
  },
  construction: {
    modules: [...defaultModules, "inventory"],
    warehouses: ["Central Depot", "Site Warehouse"],
    expenseCategories: ["Admin", "Transport", "Rentals"],
    costCategories: ["Materials", "Labor", "Subcontractors"],
    revenueStreams: ["Project Revenue", "Maintenance Contracts"],
    accounts: [...baseAccounts]
  },
  clothing_store: {
    modules: [...defaultModules, "inventory", "pos"],
    warehouses: ["Store Stockroom", "Seasonal Warehouse"],
    expenseCategories: ["Marketing", "Staff", "Rent"],
    costCategories: ["Merchandise Purchases", "Shipping"],
    revenueStreams: ["Retail Sales", "Online Sales"],
    accounts: [...baseAccounts]
  },
  electronics_store: {
    modules: [...defaultModules, "inventory", "pos"],
    warehouses: ["Main Stock", "High-Value Vault"],
    expenseCategories: ["Salaries", "Marketing", "Warranty Costs"],
    costCategories: ["Device Purchases", "Freight", "Returns"],
    revenueStreams: ["Device Sales", "Accessories", "Services"],
    accounts: [...baseAccounts]
  },
  services_company: {
    modules: defaultModules,
    warehouses: ["Documents Archive"],
    expenseCategories: ["Salaries", "Software", "Rent", "Marketing"],
    costCategories: ["Direct Service Delivery", "Subcontractors"],
    revenueStreams: ["Consulting Fees", "Maintenance Contracts"],
    accounts: [...baseAccounts.filter((account) => account.code !== "1200")]
  }
};

const normalizeActivity = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export interface SetupSuggestion {
  modules: ModuleKey[];
  warehouses: string[];
  expenseCategories: string[];
  costCategories: string[];
  revenueStreams: string[];
  chartOfAccounts: AccountTemplate[];
}

export const getSetupSuggestion = (activity: string): SetupSuggestion => {
  const normalized = normalizeActivity(activity);
  const template = templates[normalized] ?? templates.services_company;

  return {
    modules: template.modules,
    warehouses: template.warehouses,
    expenseCategories: template.expenseCategories,
    costCategories: template.costCategories,
    revenueStreams: template.revenueStreams,
    chartOfAccounts: template.accounts
  };
};
