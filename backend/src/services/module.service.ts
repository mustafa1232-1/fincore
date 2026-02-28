import { moduleRepository } from "../repositories/module.repository";
import { ModuleKey } from "../models/common";

export const moduleService = {
  async list(tenantId: string) {
    return moduleRepository.listTenantModules(tenantId);
  },

  async toggle(tenantId: string, moduleKey: ModuleKey, enabled: boolean) {
    await moduleRepository.toggleModule(tenantId, moduleKey, enabled);
    return moduleRepository.listTenantModules(tenantId);
  }
};
