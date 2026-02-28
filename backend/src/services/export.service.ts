import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const toBuffer = (doc: PDFKit.PDFDocument): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
};

export const exportService = {
  async trialBalanceExcel(input: {
    from: string;
    to: string;
    templateMode?: boolean;
    lines: Array<{ code: string; name: string; debit: string | number; credit: string | number; balance?: string | number }>;
  }): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheetName = input.templateMode ? "Trial Balance Template" : "Trial Balance";
    const sheet = workbook.addWorksheet(sheetName);

    if (input.templateMode) {
      // Template mode is designed for upload, so row 1 must be the true header row.
      sheet.addRow(["Account Code", "Account Name", "Debit", "Credit"]);
      input.lines.forEach((line) => {
        sheet.addRow([line.code, line.name, Number(line.debit), Number(line.credit)]);
      });
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      const guide = workbook.addWorksheet("Instructions");
      guide.addRow(["Trial Balance Template"]);
      guide.addRow([]);
      guide.addRow(["From", input.from]);
      guide.addRow(["To", input.to]);
      guide.addRow([]);
      guide.addRow([
        "Fill Debit/Credit values then upload this file from the app. Account code or account name will be auto-matched."
      ]);
      guide.addRow(["Rows with zero debit and zero credit are ignored."]);
    } else {
      sheet.addRow(["From", input.from, "To", input.to]);
      sheet.addRow([]);
      sheet.addRow(["Code", "Account", "Debit", "Credit", "Balance"]);
      input.lines.forEach((line) => {
        sheet.addRow([line.code, line.name, Number(line.debit), Number(line.credit), Number(line.balance ?? 0)]);
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  },

  async genericPdf(input: {
    title: string;
    rows: Array<{ label: string; value: string | number }>;
  }): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    doc.fontSize(18).text(input.title, { underline: true });
    doc.moveDown();

    input.rows.forEach((row) => {
      doc.fontSize(11).text(`${row.label}: ${row.value}`);
    });

    return toBuffer(doc);
  }
};
