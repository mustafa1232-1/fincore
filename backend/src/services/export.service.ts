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
    lines: Array<{ code: string; name: string; debit: string | number; credit: string | number; balance: string | number }>;
  }): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Trial Balance");

    sheet.addRow(["From", input.from, "To", input.to]);
    sheet.addRow([]);
    sheet.addRow(["Code", "Account", "Debit", "Credit", "Balance"]);

    input.lines.forEach((line) => {
      sheet.addRow([line.code, line.name, Number(line.debit), Number(line.credit), Number(line.balance)]);
    });

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
