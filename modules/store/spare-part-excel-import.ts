import * as XLSX from "xlsx";

export const SparePartImportSheetName = "Spare_Parts_Import";

export const SparePartImportHeaders = {
  itemCode: "Item Code*",
  name: "ชื่ออะไหล่ (Spare Part Name)*",
  description: "รายละเอียดอะไหล่ (Description)",
  unit: "หน่วยนับ (Unit)*",
  storeCode: "รหัสคลังอะไหล่ (Store Code)*",
  typeCode: "รหัสประเภท (Type Code)*",
  categoryCode: "รหัสหมวดหมู่ (Category Code)*",
  minStock: "Stock ขั้นต่ำ (Min Stock)*",
  maxStock: "Stock สูงสุด (Max Stock)",
  reorderPoint: "จุดสั่งซื้อ (Reorder Point)*",
  latestUnitPrice: "ราคาล่าสุด (Latest Unit Price)",
  openingQuantity: "จำนวนตั้งต้น (Opening Quantity)",
  active: "สถานะใช้งาน (Active TRUE/FALSE)",
} as const;

const requiredHeaders = Object.values(SparePartImportHeaders);
const maxImportRows = 2_000;

export type ParsedSparePartImportRow = {
  rowNumber: number;
  itemCode: string;
  name: string;
  description: string | null;
  unit: string;
  storeCode: string;
  typeCode: string;
  categoryCode: string;
  minStock: number;
  maxStock: number | null;
  reorderPoint: number;
  latestUnitPrice: number | null;
  openingQuantity: number;
  active: boolean;
};

export type SparePartImportMasterData = {
  stores: Array<{ id: string; code: string }>;
  types: Array<{ id: string; code: string }>;
  categories: Array<{ id: string; code: string | null }>;
  existingItemCodes: string[];
};

export type ValidatedSparePartImportRow = ParsedSparePartImportRow & {
  storeId: string;
  typeId: string;
  categoryId: string;
};

export class SparePartImportValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" | "));
    this.name = "SparePartImportValidationError";
    this.issues = issues;
  }
}

export function parseSparePartImportWorkbook(buffer: ArrayBuffer | Uint8Array) {
  let workbook: ReturnType<typeof XLSX.read>;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  } catch {
    throw new SparePartImportValidationError(["ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาใช้ไฟล์ .xlsx จาก Template"]);
  }

  const worksheet = workbook.Sheets[SparePartImportSheetName];
  if (!worksheet) {
    throw new SparePartImportValidationError([`ไม่พบ Sheet ชื่อ ${SparePartImportSheetName}`]);
  }

  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  }) as unknown[][];
  const headerRow = (matrix[0] ?? []).map(normalizeText);
  const headerIndex = new Map(headerRow.map((header, index) => [header, index]));
  const missingHeaders = requiredHeaders.filter((header) => !headerIndex.has(header));
  if (missingHeaders.length) {
    throw new SparePartImportValidationError([
      `หัวคอลัมน์ไม่ตรงกับ Template: ไม่พบ ${missingHeaders.join(", ")}`,
    ]);
  }

  const dataRows = matrix.slice(1).filter((row) => row.some((value) => normalizeText(value)));
  if (!dataRows.length) {
    throw new SparePartImportValidationError(["ไฟล์ไม่มีรายการอะไหล่สำหรับนำเข้า"]);
  }
  if (dataRows.length > maxImportRows) {
    throw new SparePartImportValidationError([`นำเข้าได้สูงสุด ${maxImportRows.toLocaleString()} รายการต่อไฟล์`]);
  }

  const issues: string[] = [];
  const rows = dataRows.map((row, index) => parseRow(row, index + 2, headerIndex, issues));
  if (issues.length) throw new SparePartImportValidationError(issues);
  return rows;
}

export function validateSparePartImportRows(
  rows: ParsedSparePartImportRow[],
  masterData: SparePartImportMasterData,
) {
  const stores = codeMap(masterData.stores);
  const types = codeMap(masterData.types);
  const categories = codeMap(masterData.categories.filter((category) => category.code));
  const existingItemCodes = new Set(masterData.existingItemCodes.map(normalizeCode));
  const fileItemCodes = new Set<string>();
  const issues: string[] = [];

  const validated = rows.map((row): ValidatedSparePartImportRow => {
    const storeId = stores.get(row.storeCode);
    const typeId = types.get(row.typeCode);
    const categoryId = categories.get(row.categoryCode);

    if (!storeId) issues.push(`แถว ${row.rowNumber}: ไม่พบรหัสคลังอะไหล่ ${row.storeCode} ใน Site นี้`);
    if (!typeId) issues.push(`แถว ${row.rowNumber}: ไม่พบรหัสประเภท ${row.typeCode} ใน Site นี้`);
    if (!categoryId) issues.push(`แถว ${row.rowNumber}: ไม่พบรหัสหมวดหมู่ ${row.categoryCode} ใน Site นี้`);
    if (existingItemCodes.has(row.itemCode)) {
      issues.push(`แถว ${row.rowNumber}: Item Code ${row.itemCode} มีอยู่ใน Organization แล้ว`);
    }
    if (fileItemCodes.has(row.itemCode)) {
      issues.push(`แถว ${row.rowNumber}: Item Code ${row.itemCode} ซ้ำภายในไฟล์`);
    }
    fileItemCodes.add(row.itemCode);

    return {
      ...row,
      storeId: storeId ?? "",
      typeId: typeId ?? "",
      categoryId: categoryId ?? "",
    };
  });

  if (issues.length) throw new SparePartImportValidationError(issues);
  return validated;
}

export function sparePartImportErrorMessage(error: unknown) {
  if (error instanceof SparePartImportValidationError) {
    const visibleIssues = error.issues.slice(0, 8);
    const remaining = error.issues.length - visibleIssues.length;
    return `${visibleIssues.join(" | ")}${remaining > 0 ? ` | และอีก ${remaining} จุด` : ""}`;
  }
  return error instanceof Error ? error.message : "นำเข้า Excel ไม่สำเร็จ";
}

function parseRow(
  row: unknown[],
  rowNumber: number,
  headerIndex: Map<string, number>,
  issues: string[],
): ParsedSparePartImportRow {
  const value = (header: string) => row[headerIndex.get(header) ?? -1];
  const itemCode = requiredCode(value(SparePartImportHeaders.itemCode), "Item Code", rowNumber, issues);
  const name = requiredText(value(SparePartImportHeaders.name), "ชื่ออะไหล่", rowNumber, issues);
  const unit = requiredText(value(SparePartImportHeaders.unit), "หน่วยนับ", rowNumber, issues);
  const storeCode = requiredCode(value(SparePartImportHeaders.storeCode), "รหัสคลังอะไหล่", rowNumber, issues);
  const typeCode = requiredCode(value(SparePartImportHeaders.typeCode), "รหัสประเภท", rowNumber, issues);
  const categoryCode = requiredCode(value(SparePartImportHeaders.categoryCode), "รหัสหมวดหมู่", rowNumber, issues);
  const minStock = numericValue(value(SparePartImportHeaders.minStock), "Stock ขั้นต่ำ", rowNumber, issues, true) ?? 0;
  const maxStock = numericValue(value(SparePartImportHeaders.maxStock), "Stock สูงสุด", rowNumber, issues, false);
  const reorderPoint = numericValue(
    value(SparePartImportHeaders.reorderPoint),
    "จุดสั่งซื้อ",
    rowNumber,
    issues,
    true,
  ) ?? 0;
  const latestUnitPrice = numericValue(
    value(SparePartImportHeaders.latestUnitPrice),
    "ราคาล่าสุด",
    rowNumber,
    issues,
    false,
  );
  const openingQuantity = numericValue(
    value(SparePartImportHeaders.openingQuantity),
    "จำนวนตั้งต้น",
    rowNumber,
    issues,
    false,
  ) ?? 0;

  if (maxStock != null && maxStock < minStock) {
    issues.push(`แถว ${rowNumber}: Stock สูงสุดต้องไม่น้อยกว่า Stock ขั้นต่ำ`);
  }
  if (maxStock != null && reorderPoint > maxStock) {
    issues.push(`แถว ${rowNumber}: จุดสั่งซื้อต้องไม่เกิน Stock สูงสุด`);
  }

  return {
    rowNumber,
    itemCode,
    name,
    description: optionalText(value(SparePartImportHeaders.description)),
    unit,
    storeCode,
    typeCode,
    categoryCode,
    minStock,
    maxStock,
    reorderPoint,
    latestUnitPrice,
    openingQuantity,
    active: booleanValue(value(SparePartImportHeaders.active), rowNumber, issues),
  };
}

function codeMap(rows: Array<{ id: string; code: string | null }>) {
  return new Map(rows.filter((row) => row.code).map((row) => [normalizeCode(row.code), row.id]));
}

function requiredText(value: unknown, label: string, rowNumber: number, issues: string[]) {
  const normalized = normalizeText(value);
  if (!normalized) issues.push(`แถว ${rowNumber}: กรุณาระบุ ${label}`);
  return normalized;
}

function requiredCode(value: unknown, label: string, rowNumber: number, issues: string[]) {
  const normalized = normalizeCode(value);
  if (!normalized) issues.push(`แถว ${rowNumber}: กรุณาระบุ ${label}`);
  else if (!/^[A-Z0-9][A-Z0-9._/-]*$/.test(normalized)) {
    issues.push(`แถว ${rowNumber}: ${label} ใช้ได้เฉพาะ A-Z, 0-9, จุด, ขีดล่าง, / และ -`);
  }
  return normalized;
}

function numericValue(
  value: unknown,
  label: string,
  rowNumber: number,
  issues: string[],
  required: boolean,
) {
  const text = normalizeText(value).replace(/,/g, "");
  if (!text) {
    if (required) issues.push(`แถว ${rowNumber}: กรุณาระบุ ${label}`);
    return null;
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    issues.push(`แถว ${rowNumber}: ${label} ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป`);
    return null;
  }
  return parsed;
}

function booleanValue(value: unknown, rowNumber: number, issues: string[]) {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized) return true;
  if (["TRUE", "1", "YES", "Y", "ใช้งาน"].includes(normalized)) return true;
  if (["FALSE", "0", "NO", "N", "ไม่ใช้งาน"].includes(normalized)) return false;
  issues.push(`แถว ${rowNumber}: สถานะใช้งานต้องเป็น TRUE หรือ FALSE`);
  return true;
}

function optionalText(value: unknown) {
  return normalizeText(value) || null;
}

function normalizeCode(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function normalizeText(value: unknown) {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}
