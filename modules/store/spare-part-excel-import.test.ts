import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  parseSparePartImportWorkbook,
  SparePartImportHeaders,
  SparePartImportSheetName,
  SparePartImportValidationError,
  validateSparePartImportRows,
} from "./spare-part-excel-import";

const headers = Object.values(SparePartImportHeaders);

function workbookBuffer(rows: unknown[][], sheetName = SparePartImportSheetName) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), sheetName);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function validRow(itemCode = "MCCB001") {
  return [
    itemCode,
    "MCCB 3P 32A",
    "Main breaker",
    "PCS",
    "SP01",
    "630101",
    "EI",
    2,
    20,
    5,
    450,
    10,
    "TRUE",
  ];
}

describe("Spare parts Excel import", () => {
  it("parses and resolves a valid row against Site master data", () => {
    const parsed = parseSparePartImportWorkbook(workbookBuffer([validRow()]));
    const validated = validateSparePartImportRows(parsed, {
      stores: [{ id: "store-1", code: "SP01" }],
      types: [{ id: "type-1", code: "630101" }],
      categories: [{ id: "category-1", code: "EI" }],
      existingItemCodes: [],
    });

    expect(validated).toHaveLength(1);
    expect(validated[0]).toMatchObject({
      itemCode: "MCCB001",
      name: "MCCB 3P 32A",
      storeId: "store-1",
      typeId: "type-1",
      categoryId: "category-1",
      openingQuantity: 10,
      active: true,
    });
  });

  it("rejects a workbook with the wrong sheet name", () => {
    expect(() => parseSparePartImportWorkbook(workbookBuffer([validRow()], "Wrong_Sheet"))).toThrow(
      SparePartImportValidationError,
    );
  });

  it("rejects duplicate Item Codes and unknown reference codes", () => {
    const parsed = parseSparePartImportWorkbook(workbookBuffer([validRow(), validRow()]));

    expect(() => validateSparePartImportRows(parsed, {
      stores: [],
      types: [],
      categories: [],
      existingItemCodes: ["MCCB001"],
    })).toThrow(SparePartImportValidationError);
  });

  it("rejects invalid stock limits before writing any data", () => {
    const row = validRow();
    row[7] = 20;
    row[8] = 10;

    expect(() => parseSparePartImportWorkbook(workbookBuffer([row]))).toThrow(
      SparePartImportValidationError,
    );
  });
});
