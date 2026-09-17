import ExcelJS from "exceljs";
import type { DailyIssueReportRow } from "./store-daily-issue-report";

type DailyIssueWorkbookInput = {
  rows: DailyIssueReportRow[];
  columns: string[];
  title: string;
  dateRangeLabel: string;
  sheetName?: string;
};

const headerFill = "164E63";
const accentColor = "0F766E";
const textColor = "0F172A";
const mutedColor = "64748B";
const stripeFill = "F1F5F9";
const totalFill = "CCFBF1";
const lineColor = "E2E8F0";

export async function buildDailyIssueWorkbook(input: DailyIssueWorkbookInput) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PowerCare CM";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const worksheet = workbook.addWorksheet(input.sheetName ?? "Issue by Date", {
    views: [{ state: "frozen", xSplit: 4, ySplit: 5, topLeftCell: "E6", showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const lastColumn = input.columns.length;
  const lastColumnLetter = worksheet.getColumn(lastColumn).letter;

  worksheet.getCell("A2").value = input.title;
  worksheet.getCell("A2").font = { name: "Arial", size: 16, bold: true, color: { argb: textColor } };
  worksheet.getCell("A3").value = input.dateRangeLabel;
  worksheet.getCell("A3").font = { name: "Arial", size: 10, italic: true, color: { argb: mutedColor } };
  worksheet.getRow(4).getCell(1).border = { bottom: { style: "medium", color: { argb: accentColor } } };
  for (let column = 2; column <= lastColumn; column += 1) {
    worksheet.getRow(4).getCell(column).border = { bottom: { style: "medium", color: { argb: accentColor } } };
  }

  const headerRow = worksheet.getRow(5);
  headerRow.values = input.columns;
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerFill } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      bottom: { style: "medium", color: { argb: accentColor } },
      right: { style: "thin", color: { argb: "FFFFFF" } },
    };
  });

  const firstDateColumn = input.columns.findIndex((column) => column.startsWith("วันที่ ")) + 1;
  const firstDataRow = 6;
  input.rows.forEach((reportRow, rowIndex) => {
    const excelRowNumber = firstDataRow + rowIndex;
    const excelRow = worksheet.getRow(excelRowNumber);
    excelRow.height = 24;
    input.columns.forEach((column, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1);
      cell.value = reportRow[column] ?? "";
      cell.font = { name: "Arial", size: 10, color: { argb: textColor } };
      cell.alignment = { vertical: "middle", horizontal: columnIndex >= 7 ? "right" : "left" };
      cell.border = { bottom: { style: "thin", color: { argb: lineColor } } };
      if (rowIndex % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeFill } };
    });
    const quantityResult = Number(reportRow.Quantity ?? 0);
    const totalValueResult = Number(reportRow["Total Value"] ?? 0);
    if (firstDateColumn > 0) {
      excelRow.getCell(8).value = { formula: `SUM(${worksheet.getColumn(firstDateColumn).letter}${excelRowNumber}:${lastColumnLetter}${excelRowNumber})`, result: quantityResult };
    }
    excelRow.getCell(12).value = { formula: `H${excelRowNumber}*K${excelRowNumber}`, result: totalValueResult };
    excelRow.getCell(4).font = { name: "Arial", size: 10, bold: true, color: { argb: accentColor } };
  });

  const totalRowNumber = firstDataRow + input.rows.length;
  const totalRow = worksheet.getRow(totalRowNumber);
  totalRow.height = 24;
  totalRow.getCell(1).value = "รวม";
  worksheet.mergeCells(totalRowNumber, 1, totalRowNumber, 7);
  const totalQuantity = input.rows.reduce((sum, row) => sum + Number(row.Quantity ?? 0), 0);
  const totalValue = input.rows.reduce((sum, row) => sum + Number(row["Total Value"] ?? 0), 0);
  if (input.rows.length) {
    totalRow.getCell(8).value = { formula: `SUM(H${firstDataRow}:H${totalRowNumber - 1})`, result: totalQuantity };
    totalRow.getCell(12).value = { formula: `SUM(L${firstDataRow}:L${totalRowNumber - 1})`, result: totalValue };
  } else {
    totalRow.getCell(8).value = 0;
    totalRow.getCell(12).value = 0;
  }
  for (let column = Math.max(firstDateColumn, 13); column <= lastColumn; column += 1) {
    const result = input.rows.reduce((sum, row) => sum + Number(row[input.columns[column - 1]] ?? 0), 0);
    totalRow.getCell(column).value = input.rows.length
      ? { formula: `SUM(${worksheet.getColumn(column).letter}${firstDataRow}:${worksheet.getColumn(column).letter}${totalRowNumber - 1})`, result }
      : 0;
  }
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: totalFill } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "134E4A" } };
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.border = {
      top: { style: "medium", color: { argb: accentColor } },
      bottom: { style: "medium", color: { argb: accentColor } },
    };
  });
  totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

  const fixedWidths = [13, 18, 14, 20, 28, 18, 24, 12, 12, 10, 13, 15];
  input.columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = index < fixedWidths.length ? fixedWidths[index] : 15;
    if (index >= 7) worksheet.getColumn(index + 1).numFmt = "#,##0.00";
  });
  worksheet.autoFilter = { from: "A5", to: `${lastColumnLetter}5` };
  worksheet.properties.defaultRowHeight = 18;
  worksheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

  const bytes = await workbook.xlsx.writeBuffer();
  return new Uint8Array(bytes);
}
