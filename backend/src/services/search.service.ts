import { searchRepository } from "../repositories/search.repository";

export const searchService = {
  async global(tenantId: string, q: string) {
    return searchRepository.globalSearch(tenantId, q);
  }
};
