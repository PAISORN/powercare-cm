import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { dailyIssueReportColumns, type DailyIssueReportRow } from "./store-daily-issue-report";
import { buildDailyIssueWorkbook } from "./store-daily-issue-workbook";

const range = {
  start: new Date("2026-08-31T17:00:00.000Z"),
  end: new Date("2026-09-02T16:59:59.999Z"),
};

const row: DailyIssueReportRow = {
  "Store Code": "RTB",
  "Store Name": "Store",
  "Item Type": "CHEMICAL",
  "Item Code": "CM000001",
  "Item Name": "Biocide",
  Category: "Lab",
  "Material Group": "สารเคมี",
  Quantity: 3,
  Minimum: 10,
  Unit: "kg",
  "Unit Price": 58,
  "Total Value": 174,
  "วันที่ 01/09/2026": 1,
  "วันที่ 02/09/2026": 2,
};

describe("daily issue workbook", () => {
  it("matches the approved sample layout, formulas, totals, and frozen panes", async () => {
    const buffer = await buildDailyIssueWorkbook({
      rows: [row],
      columns: dailyIssueReportColumns(range),
      title: "รายงานรายการเบิกสารเคมี",
      dateRangeLabel: "ช่วงวันที่ 1–2 กันยายน 2026 · ข้อมูลจากรายการเบิกที่จ่ายออกแล้ว",
      sheetName: "Chemical Issue",
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer.buffer as ArrayBuffer);
    const sheet = workbook.getWorksheet("Chemical Issue");

    expect(sheet).toBeTruthy();
    expect(sheet?.getCell("A2").value).toBe("รายงานรายการเบิกสารเคมี");
    expect(sheet?.getCell("A3").value).toContain("1–2 กันยายน 2026");
    expect(sheet?.getRow(5).values).toEqual([
      undefined,
      "Store Code", "Store Name", "Item Type", "Item Code", "Item Name", "Category", "Material Group",
      "Quantity", "Minimum", "Unit", "Unit Price", "Total Value", "วันที่ 01/09/2026", "วันที่ 02/09/2026",
    ]);
    expect(sheet?.getCell("H6").value).toMatchObject({ formula: "SUM(M6:N6)", result: 3 });
    expect(sheet?.getCell("L6").value).toMatchObject({ formula: "H6*K6", result: 174 });
    expect(sheet?.getCell("A7").value).toBe("รวม");
    expect(sheet?.getCell("H7").value).toMatchObject({ formula: "SUM(H6:H6)", result: 3 });
    expect(sheet?.getCell("N7").value).toMatchObject({ formula: "SUM(N6:N6)", result: 2 });
    expect(sheet?.getCell("A5").fill).toMatchObject({ type: "pattern", fgColor: { argb: "164E63" } });
    expect(sheet?.getCell("A5").font).toMatchObject({ name: "Arial", bold: true, color: { argb: "FFFFFF" } });
    expect(sheet?.views[0]).toMatchObject({ state: "frozen", xSplit: 4, ySplit: 5 });
  });
});
