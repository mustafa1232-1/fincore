import { invoiceRepository } from "../repositories/invoice.repository";
import { accountingService } from "./accounting.service";
import { accountingRepository } from "../repositories/accounting.repository";
import { inventoryRepository } from "../repositories/inventory.repository";
import { AppError } from "../utils/errors";

const round2 = (value: number): number => Number(value.toFixed(2));

const ensureSystemAccount = async (
  tenantId: string,
  code: string,
  name: string,
  type: "asset" | "liability" | "equity" | "revenue" | "expense" | "cost"
) => {
  const existing = await accountingRepository.findAccountByCode(tenantId, code);
  if (existing) {
    return existing;
  }

  return accountingRepository.createAccount({
    tenantId,
    code,
    name,
    type,
    isSystem: true
  });
};

export const invoiceService = {
  async create(input: {
    tenantId: string;
    createdBy: string;
    type: "sale" | "purchase";
    customerName?: string;
    invoiceDate: string;
    taxAmount: number;
    discountAmount: number;
    lines: Array<{ itemId?: string; description?: string; quantity: number; unitPrice?: number }>;
  }) {
    if (!input.lines.length) {
      throw new AppError("Invoice must include at least one line", 422);
    }

    const enrichedLines: Array<{
      itemId?: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
    }> = [];

    for (const line of input.lines) {
      if (line.quantity <= 0) {
        throw new AppError("Line quantity must be greater than zero", 422);
      }

      if (line.itemId) {
        const item = await inventoryRepository.getItemById(input.tenantId, line.itemId);
        if (!item) {
          throw new AppError(`Item not found: ${line.itemId}`, 422);
        }

        enrichedLines.push({
          itemId: line.itemId,
          description: line.description ?? item.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice ?? Number(item.price),
          unitCost: Number(item.cost)
        });
      } else {
        if (line.unitPrice === undefined) {
          throw new AppError("unitPrice is required for manual lines", 422);
        }

        enrichedLines.push({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: 0
        });
      }
    }

    const created = await invoiceRepository.createInvoice({
      tenantId: input.tenantId,
      type: input.type,
      customerName: input.customerName,
      invoiceDate: input.invoiceDate,
      taxAmount: input.taxAmount,
      discountAmount: input.discountAmount,
      lines: enrichedLines,
      createdBy: input.createdBy
    });

    if (input.type === "sale") {
      const warehouseList = await inventoryRepository.listWarehouses(input.tenantId);
      const defaultWarehouse = warehouseList[0];

      const totalCost = round2(
        enrichedLines.reduce((sum, line) => sum + line.unitCost * line.quantity, 0)
      );

      if (defaultWarehouse) {
        for (const line of enrichedLines) {
          if (!line.itemId) {
            continue;
          }

          await inventoryRepository.createStockMove({
            tenantId: input.tenantId,
            itemId: line.itemId,
            warehouseId: defaultWarehouse.id,
            moveType: "sale",
            quantity: line.quantity,
            unitCost: line.unitCost,
            referenceType: "invoice",
            referenceId: created.invoiceId,
            note: `Auto-generated from invoice ${created.invoiceNumber}`,
            createdBy: input.createdBy
          });
        }
      }

      const cashAccount = await ensureSystemAccount(input.tenantId, "1000", "Cash", "asset");
      const salesAccount = await ensureSystemAccount(input.tenantId, "4000", "Sales Revenue", "revenue");
      const cogsAccount = await ensureSystemAccount(input.tenantId, "5000", "Cost of Sales", "cost");
      const inventoryAccount = await ensureSystemAccount(input.tenantId, "1200", "Inventory", "asset");

      const journalLines = [
        {
          accountId: cashAccount.id,
          debit: round2(created.totalAmount),
          credit: 0,
          description: `Invoice ${created.invoiceNumber}`
        },
        {
          accountId: salesAccount.id,
          debit: 0,
          credit: round2(created.totalAmount),
          description: `Sales revenue ${created.invoiceNumber}`
        }
      ];

      if (totalCost > 0) {
        journalLines.push(
          {
            accountId: cogsAccount.id,
            debit: totalCost,
            credit: 0,
            description: `COGS ${created.invoiceNumber}`
          },
          {
            accountId: inventoryAccount.id,
            debit: 0,
            credit: totalCost,
            description: `Inventory relief ${created.invoiceNumber}`
          }
        );
      }

      await accountingService.createJournalEntry({
        tenantId: input.tenantId,
        date: input.invoiceDate,
        description: `Auto journal for invoice ${created.invoiceNumber}`,
        createdBy: input.createdBy,
        sourceType: "invoice",
        sourceId: created.invoiceId,
        lines: journalLines
      });
    }

    return {
      ...created,
      lines: enrichedLines
    };
  },

  async list(tenantId: string) {
    const invoices = await invoiceRepository.listInvoices(tenantId);

    const withLines = await Promise.all(
      invoices.map(async (invoice) => ({
        ...invoice,
        lines: await invoiceRepository.getInvoiceLines(tenantId, invoice.id)
      }))
    );

    return withLines;
  }
};
