import XLSX from "xlsx";
import { accountingRepository } from "../repositories/accounting.repository";
import { AccountType } from "../models/common";
import { AppError, NotFoundError } from "../utils/errors";
import { normalizePagination } from "../utils/pagination";

interface TrialBalanceImportRow {
  accountCode?: string;
  accountName: string;
  debit: number;
  credit: number;
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const guessAccountType = (debit: number, credit: number): AccountType => {
  if (credit > debit) {
    return "revenue";
  }

  return "expense";
};

const normalizeHeader = (header: string): string =>
  header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const accountingService = {
  async listAccountsTree(tenantId: string) {
    const accounts = await accountingRepository.listAccounts(tenantId);

    const map = new Map<string, (typeof accounts)[number] & { children: unknown[] }>();
    const roots: Array<(typeof accounts)[number] & { children: unknown[] }> = [];

    for (const account of accounts) {
      map.set(account.id, { ...account, children: [] });
    }

    for (const account of map.values()) {
      if (account.parent_id && map.has(account.parent_id)) {
        (map.get(account.parent_id)?.children as unknown[]).push(account);
      } else {
        roots.push(account);
      }
    }

    return {
      flat: accounts,
      tree: roots
    };
  },

  async createAccount(input: {
    tenantId: string;
    parentId?: string;
    code: string;
    name: string;
    type: AccountType;
    isSystem?: boolean;
  }) {
    return accountingRepository.createAccount(input);
  },

  async updateAccount(input: {
    tenantId: string;
    accountId: string;
    parentId?: string;
    code: string;
    name: string;
    type: AccountType;
  }) {
    const updated = await accountingRepository.updateAccount(input);
    if (!updated) {
      throw new NotFoundError("Account not found");
    }

    return updated;
  },

  async deleteAccount(tenantId: string, accountId: string) {
    const account = await accountingRepository.getAccountById(tenantId, accountId);
    if (!account) {
      throw new NotFoundError("Account not found");
    }

    if (account.is_system) {
      throw new AppError("System account cannot be deleted", 422);
    }

    const hasChildren = await accountingRepository.hasAccountChildren(tenantId, accountId);
    if (hasChildren) {
      throw new AppError("Cannot delete account with child accounts", 422);
    }

    const hasJournalLines = await accountingRepository.hasAccountJournalLines(tenantId, accountId);
    if (hasJournalLines) {
      throw new AppError("Cannot delete account used in journal lines", 422);
    }

    await accountingRepository.deleteAccount(tenantId, accountId);
  },

  async createJournalEntry(input: {
    tenantId: string;
    date: string;
    description?: string;
    createdBy: string;
    sourceType?: string;
    sourceId?: string;
    lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>;
  }) {
    if (!input.lines.length) {
      throw new AppError("Journal entry must include at least one line", 422);
    }

    let debitTotal = 0;
    let creditTotal = 0;

    for (const line of input.lines) {
      if (line.debit < 0 || line.credit < 0) {
        throw new AppError("Debit/Credit cannot be negative", 422);
      }

      if (line.debit > 0 && line.credit > 0) {
        throw new AppError("A line cannot contain both debit and credit values", 422);
      }

      if (line.debit === 0 && line.credit === 0) {
        throw new AppError("A line must contain debit or credit amount", 422);
      }

      debitTotal += line.debit;
      creditTotal += line.credit;

      const account = await accountingRepository.getAccountById(input.tenantId, line.accountId);
      if (!account) {
        throw new AppError(`Account not found: ${line.accountId}`, 422);
      }
    }

    const roundedDebit = Number(debitTotal.toFixed(2));
    const roundedCredit = Number(creditTotal.toFixed(2));

    if (roundedDebit !== roundedCredit) {
      throw new AppError("Unbalanced journal entry. Debit must equal Credit", 422, {
        debitTotal: roundedDebit,
        creditTotal: roundedCredit
      });
    }

    return accountingRepository.createJournalEntry(input);
  },

  async listJournalEntries(tenantId: string, page?: number, pageSize?: number) {
    const pagination = normalizePagination({ page, pageSize });

    const entries = await accountingRepository.listJournalEntries(
      tenantId,
      pagination.limit,
      pagination.offset
    );

    const enriched = await Promise.all(
      entries.map(async (entry) => ({
        ...entry,
        lines: await accountingRepository.getJournalEntryLines(tenantId, entry.id)
      }))
    );

    return {
      page: pagination.page,
      pageSize: pagination.pageSize,
      data: enriched
    };
  },

  async generateTrialBalance(input: {
    tenantId: string;
    from: string;
    to: string;
    createdBy: string;
    source?: string;
  }) {
    const lines = await accountingRepository.getTrialBalance(input.tenantId, input.from, input.to);
    const totals = lines.reduce(
      (acc, line) => {
        acc.debit += Number(line.debit);
        acc.credit += Number(line.credit);
        return acc;
      },
      { debit: 0, credit: 0 }
    );

    await accountingRepository.storeTrialBalanceSnapshot({
      tenantId: input.tenantId,
      from: input.from,
      to: input.to,
      source: input.source ?? "system",
      createdBy: input.createdBy,
      totals: {
        lines,
        totals
      }
    });

    return {
      from: input.from,
      to: input.to,
      lines,
      totals: {
        debit: Number(totals.debit.toFixed(2)),
        credit: Number(totals.credit.toFixed(2))
      }
    };
  },

  async generateTrialBalanceTemplate(tenantId: string) {
    const accounts = await accountingRepository.listAccounts(tenantId);

    return accounts.map((account) => ({
      account_id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: 0,
      credit: 0,
      balance: 0
    }));
  },

  async importTrialBalanceFromExcel(input: {
    tenantId: string;
    userId: string;
    from: string;
    to: string;
    fileBuffer: Buffer;
    postToLedger?: boolean;
  }) {
    const workbook = XLSX.read(input.fileBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new AppError("Excel file has no sheets", 422);
    }

    const sheet = workbook.Sheets[firstSheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    const rows: TrialBalanceImportRow[] = raw
      .map((entry) => {
        const normalizedEntries = Object.fromEntries(
          Object.entries(entry).map(([key, value]) => [normalizeHeader(key), value])
        );

        const accountCode = String(
          normalizedEntries.account_code ??
            normalizedEntries.code ??
            normalizedEntries.accountcode ??
            ""
        ).trim();

        const accountName = String(
          normalizedEntries.account_name ?? normalizedEntries.account ?? normalizedEntries.name ?? ""
        ).trim();

        const debit = toNumber(normalizedEntries.debit ?? normalizedEntries.dr ?? 0);
        const credit = toNumber(normalizedEntries.credit ?? normalizedEntries.cr ?? 0);

        return { accountCode, accountName, debit, credit };
      })
      .filter(
        (row) => (row.accountName.length > 0 || (row.accountCode ?? "").length > 0) && (row.debit > 0 || row.credit > 0)
      );

    if (!rows.length) {
      throw new AppError("No valid trial balance rows found in Excel", 422);
    }

    const allAccounts = await accountingRepository.listAccounts(input.tenantId);
    const accountByName = new Map(allAccounts.map((account) => [account.name.toLowerCase(), account]));
    const accountByCode = new Map(allAccounts.map((account) => [account.code.toLowerCase(), account]));
    const importedLines: Array<{ accountId: string; accountName: string; debit: number; credit: number }> = [];

    let createdCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const existingByCode = row.accountCode
        ? accountByCode.get(row.accountCode.toLowerCase())
        : undefined;
      const existingByName = row.accountName
        ? accountByName.get(row.accountName.toLowerCase())
        : undefined;
      const existing = existingByCode ?? existingByName;

      let accountId = existing?.id;
      let accountName = existing?.name ?? row.accountName;
      let accountCode = row.accountCode;

      if (!accountId) {
        let code = (accountCode ?? "").trim();
        if (!code) {
          code = `9${String(Date.now()).slice(-5)}${String(index).padStart(3, "0")}`;
        }
        while (accountByCode.has(code.toLowerCase())) {
          code = `${code}_${index}`;
        }

        if (!accountName) {
          accountName = `Imported Account ${code}`;
        }

        const created = await accountingRepository.createAccount({
          tenantId: input.tenantId,
          code,
          name: accountName,
          type: guessAccountType(row.debit, row.credit)
        });

        accountByName.set(created.name.toLowerCase(), created);
        accountByCode.set(created.code.toLowerCase(), created);
        accountId = created.id;
        accountName = created.name;
        createdCount += 1;
      }

      importedLines.push({
        accountId,
        accountName,
        debit: Number(row.debit.toFixed(2)),
        credit: Number(row.credit.toFixed(2))
      });
    }

    const debitTotal = importedLines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = importedLines.reduce((sum, line) => sum + line.credit, 0);
    const balanced = Number(debitTotal.toFixed(2)) === Number(creditTotal.toFixed(2));

    if (input.postToLedger && balanced) {
      await this.createJournalEntry({
        tenantId: input.tenantId,
        date: input.to,
        description: "Imported opening trial balance",
        createdBy: input.userId,
        sourceType: "trial_balance_import",
        lines: importedLines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: `Import from Excel: ${line.accountName}`
        }))
      });
    }

    await accountingRepository.storeTrialBalanceSnapshot({
      tenantId: input.tenantId,
      from: input.from,
      to: input.to,
      source: "excel_import",
      createdBy: input.userId,
      totals: {
        lines: importedLines,
        totals: {
          debit: Number(debitTotal.toFixed(2)),
          credit: Number(creditTotal.toFixed(2)),
          balanced
        }
      }
    });

    return {
      importedRows: importedLines.length,
      createdAccounts: createdCount,
      balanced,
      totals: {
        debit: Number(debitTotal.toFixed(2)),
        credit: Number(creditTotal.toFixed(2))
      }
    };
  }
};
