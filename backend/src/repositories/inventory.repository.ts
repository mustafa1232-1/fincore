import { withTransaction, query } from "../database/pool";

export const inventoryRepository = {
  async listItems(tenantId: string): Promise<Array<{
    id: string;
    sku: string | null;
    barcode: string | null;
    name: string;
    cost: string;
    price: string;
    quantity_on_hand: string;
  }>> {
    const { rows } = await query<{
      id: string;
      sku: string | null;
      barcode: string | null;
      name: string;
      cost: string;
      price: string;
      quantity_on_hand: string;
    }>(
      `
      SELECT id, sku, barcode, name, cost::text, price::text, quantity_on_hand::text
      FROM items
      WHERE tenant_id = $1
      ORDER BY name ASC
      `,
      [tenantId]
    );

    return rows;
  },

  async createItem(input: {
    tenantId: string;
    sku?: string;
    barcode?: string;
    name: string;
    cost: number;
    price: number;
  }): Promise<{ id: string }> {
    const { rows } = await query<{ id: string }>(
      `
      INSERT INTO items (tenant_id, sku, barcode, name, cost, price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [input.tenantId, input.sku ?? null, input.barcode ?? null, input.name, input.cost, input.price]
    );

    return rows[0];
  },

  async updateItem(input: {
    tenantId: string;
    itemId: string;
    sku?: string;
    barcode?: string;
    name: string;
    cost: number;
    price: number;
  }): Promise<void> {
    await query(
      `
      UPDATE items
      SET sku = $3,
          barcode = $4,
          name = $5,
          cost = $6,
          price = $7,
          updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
      `,
      [input.tenantId, input.itemId, input.sku ?? null, input.barcode ?? null, input.name, input.cost, input.price]
    );
  },

  async listWarehouses(tenantId: string): Promise<Array<{ id: string; name: string; code: string | null }>> {
    const { rows } = await query<{ id: string; name: string; code: string | null }>(
      `
      SELECT id, name, code
      FROM warehouses
      WHERE tenant_id = $1
      ORDER BY name ASC
      `,
      [tenantId]
    );

    return rows;
  },

  async createWarehouse(tenantId: string, name: string, code?: string): Promise<{ id: string }> {
    const { rows } = await query<{ id: string }>(
      `
      INSERT INTO warehouses (tenant_id, name, code)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [tenantId, name, code ?? null]
    );

    return rows[0];
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
  }): Promise<{ id: string }> {
    return withTransaction(async (client) => {
      const moveResult = await client.query<{ id: string }>(
        `
        INSERT INTO stock_moves (
          tenant_id, item_id, warehouse_id, target_warehouse_id,
          move_type, quantity, unit_cost, reference_type, reference_id, note, created_by
        )
        VALUES ($1, $2, $3, $4, $5::stock_move_type, $6, $7, $8, $9, $10, $11)
        RETURNING id
        `,
        [
          input.tenantId,
          input.itemId,
          input.warehouseId,
          input.targetWarehouseId ?? null,
          input.moveType,
          input.quantity,
          input.unitCost,
          input.referenceType ?? null,
          input.referenceId ?? null,
          input.note ?? null,
          input.createdBy
        ]
      );

      if (input.moveType === "sale") {
        await client.query(
          `
          UPDATE items
          SET quantity_on_hand = quantity_on_hand - $3,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2
            AND quantity_on_hand >= $3
          `,
          [input.tenantId, input.itemId, input.quantity]
        );
      } else {
        await client.query(
          `
          UPDATE items
          SET quantity_on_hand = quantity_on_hand + $3,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2
          `,
          [input.tenantId, input.itemId, input.quantity]
        );
      }

      if (input.moveType === "transfer" && input.targetWarehouseId) {
        await client.query(
          `
          INSERT INTO stock_moves (
            tenant_id, item_id, warehouse_id, move_type, quantity, unit_cost,
            reference_type, reference_id, note, created_by
          )
          VALUES ($1, $2, $3, 'adjustment', $4, $5, 'transfer_in', $6, $7, $8)
          `,
          [
            input.tenantId,
            input.itemId,
            input.targetWarehouseId,
            input.quantity,
            input.unitCost,
            moveResult.rows[0].id,
            "Auto generated from transfer",
            input.createdBy
          ]
        );
      }

      return { id: moveResult.rows[0].id };
    });
  },

  async getItemById(tenantId: string, itemId: string): Promise<{ id: string; name: string; cost: string; price: string } | null> {
    const { rows } = await query<{ id: string; name: string; cost: string; price: string }>(
      `
      SELECT id, name, cost::text, price::text
      FROM items
      WHERE tenant_id = $1 AND id = $2
      LIMIT 1
      `,
      [tenantId, itemId]
    );

    return rows[0] ?? null;
  },

  async listStockMoves(tenantId: string): Promise<Array<{
    id: string;
    item_id: string;
    warehouse_id: string;
    move_type: string;
    quantity: string;
    unit_cost: string;
    created_at: string;
  }>> {
    const { rows } = await query<{
      id: string;
      item_id: string;
      warehouse_id: string;
      move_type: string;
      quantity: string;
      unit_cost: string;
      created_at: string;
    }>(
      `
      SELECT id, item_id, warehouse_id, move_type::text, quantity::text, unit_cost::text, created_at::text
      FROM stock_moves
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 500
      `,
      [tenantId]
    );

    return rows;
  }
};
