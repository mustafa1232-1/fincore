import { inventoryRepository } from "../repositories/inventory.repository";

export const inventoryService = {
  async listItems(tenantId: string) {
    return inventoryRepository.listItems(tenantId);
  },

  async createItem(input: {
    tenantId: string;
    sku?: string;
    barcode?: string;
    name: string;
    cost: number;
    price: number;
  }) {
    return inventoryRepository.createItem(input);
  },

  async updateItem(input: {
    tenantId: string;
    itemId: string;
    sku?: string;
    barcode?: string;
    name: string;
    cost: number;
    price: number;
  }) {
    await inventoryRepository.updateItem(input);
  },

  async listWarehouses(tenantId: string) {
    return inventoryRepository.listWarehouses(tenantId);
  },

  async createWarehouse(tenantId: string, name: string, code?: string) {
    return inventoryRepository.createWarehouse(tenantId, name, code);
  },

  async createStockMove(input: {
    tenantId: string;
    itemId: string;
    warehouseId: string;
    targetWarehouseId?: string;
    moveType: "purchase" | "sale" | "adjustment" | "transfer";
    quantity: number;
    unitCost: number;
    referenceType?: string;
    referenceId?: string;
    note?: string;
    createdBy: string;
  }) {
    return inventoryRepository.createStockMove(input);
  },

  async listStockMoves(tenantId: string) {
    return inventoryRepository.listStockMoves(tenantId);
  }
};
