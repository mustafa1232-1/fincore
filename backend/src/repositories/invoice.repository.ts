import { withTransaction, query } from "../database/pool";

export interface InvoiceLineInput {
  itemId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export const invoiceRepository = {
  async generateInvoiceNumber(tenantId: string): Promise<string> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM invoices WHERE tenant_id = $1`,
      [tenantId]
    );

    const next = Number(rows[0]?.count ?? "0") + 1;
    return `INV-${next.toString().padStart(6, "0")}`;
  },

  async createInvoice(input: {
    tenantId: string;
    type: "sale" | "purchase";
    status?: "draft" | "issued" | "paid" | "void";
    customerName?: string;
    invoiceDate: string;
    taxAmount: number;
    discountAmount: number;
    lines: InvoiceLineInput[];
    createdBy: string;
  }): Promise<{ invoiceId: string; invoiceNumber: string; totalAmount: number; subtotal: number }> {
    return withTransaction(async (client) => {
      const invoiceNumber = await this.generateInvoiceNumber(input.tenantId);
      const subtotal = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      const totalAmount = subtotal + input.taxAmount - input.discountAmount;

      const invoiceResult = await client.query<{ id: string }>(
        `
        INSERT INTO invoices (
          tenant_id, invoice_number, type, status, customer_name,
          invoice_date, subtotal, tax_amount, discount_amount, total_amount, created_by
        )
        VALUES ($1, $2, $3::invoice_type, $4::invoice_status, $5, $6::date, $7, $8, $9, $10, $11)
        RETURNING id
        `,
        [
          input.tenantId,
          invoiceNumber,
          input.type,
          input.status ?? "issued",
          input.customerName ?? null,
          input.invoiceDate,
          subtotal,
          input.taxAmount,
          input.discountAmount,
          totalAmount,
          input.createdBy
        ]
      );

      const invoiceId = invoiceResult.rows[0].id;

      for (const line of input.lines) {
        const lineTotal = line.quantity * line.unitPrice;

        await client.query(
          `
          INSERT INTO invoice_lines (
            tenant_id, invoice_id, item_id, description, quantity, unit_price, unit_cost, line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            input.tenantId,
            invoiceId,
            line.itemId ?? null,
            line.description ?? null,
            line.quantity,
            line.unitPrice,
            line.unitCost,
            lineTotal
          ]
        );
      }

      await client.query(
        `
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
        VALUES ($1, $2, 'invoice_created', 'invoices', $3, $4::jsonb)
        `,
        [
          input.tenantId,
          input.createdBy,
          invoiceId,
          JSON.stringify({ invoiceNumber, subtotal, totalAmount, lineCount: input.lines.length })
        ]
      );

      return { invoiceId, invoiceNumber, totalAmount, subtotal };
    });
  },

  async listInvoices(tenantId: string): Promise<
    Array<{
      id: string;
      invoice_number: string;
      type: string;
      status: string;
      customer_name: string | null;
      invoice_date: string;
      total_amount: string;
      created_at: string;
    }>
  > {
    const { rows } = await query<{
      id: string;
      invoice_number: string;
      type: string;
      status: string;
      customer_name: string | null;
      invoice_date: string;
      total_amount: string;
      created_at: string;
    }>(
      `
      SELECT
        id,
        invoice_number,
        type::text,
        status::text,
        customer_name,
        invoice_date::text,
        total_amount::text,
        created_at::text
      FROM invoices
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 500
      `,
      [tenantId]
    );

    return rows;
  },

  async getInvoiceLines(tenantId: string, invoiceId: string): Promise<Array<{
    item_id: string | null;
    description: string | null;
    quantity: string;
    unit_price: string;
    unit_cost: string;
    line_total: string;
  }>> {
    const { rows } = await query<{
      item_id: string | null;
      description: string | null;
      quantity: string;
      unit_price: string;
      unit_cost: string;
      line_total: string;
    }>(
      `
      SELECT item_id, description, quantity::text, unit_price::text, unit_cost::text, line_total::text
      FROM invoice_lines
      WHERE tenant_id = $1
        AND invoice_id = $2
      ORDER BY created_at ASC
      `,
      [tenantId, invoiceId]
    );

    return rows;
  }
};
