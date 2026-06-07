import * as XLSX from "xlsx";

export function createCmWorkWorkbook(rows: Array<Record<string, string | number | null>>) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "CM Work");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
