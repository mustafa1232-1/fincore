import bcrypt from "bcryptjs";
import { ModuleKey } from "../models/common";
import { setupRepository } from "../repositories/setup.repository";
import { getSetupSuggestion } from "./setup-template.service";
import { authService } from "./auth.service";
import { AppError } from "../utils/errors";

export const setupService = {
  getSuggestions(activity: string) {
    return getSetupSuggestion(activity);
  },

  async completeSetup(input: {
    companyName: string;
    activity: string;
    currency: string;
    country: string;
    adminEmail: string;
    adminName: string;
    adminPassword: string;
    selectedModules?: ModuleKey[];
    accounts?: Array<{ code: string; name: string; type: "asset" | "liability" | "equity" | "revenue" | "expense" | "cost"; isSystem?: boolean }>;
    warehouses?: string[];
  }) {
    if (input.adminPassword.length < 8) {
      throw new AppError("Password must be at least 8 characters", 422);
    }

    const suggested = getSetupSuggestion(input.activity);

    const selectedModules = input.selectedModules?.length
      ? input.selectedModules
      : suggested.modules;

    const accounts = input.accounts?.length ? input.accounts : suggested.chartOfAccounts;
    const warehouses = input.warehouses?.length ? input.warehouses : suggested.warehouses;

    const passwordHash = await bcrypt.hash(input.adminPassword, 12);

    const created = await setupRepository.createTenantWithAdmin({
      companyName: input.companyName,
      activity: input.activity,
      currency: input.currency,
      country: input.country,
      adminEmail: input.adminEmail,
      adminName: input.adminName,
      passwordHash,
      selectedModules,
      accounts,
      warehouses
    });

    const auth = await authService.login({
      tenantId: created.tenantId,
      email: input.adminEmail,
      password: input.adminPassword
    });

    return {
      tenantId: created.tenantId,
      userId: created.userId,
      ...auth,
      applied: {
        modules: selectedModules,
        accountsCount: accounts.length,
        warehousesCount: warehouses.length
      }
    };
  }
};
