import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import {
  canUseUserPermission,
  PermissionKey,
} from "../../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../../modules/store/store-page-scope";
import { dailyIssueReportColumns } from "../../../../modules/store/store-daily-issue-report";
import { buildDailyIssueWorkbook } from "../../../../modules/store/store-daily-issue-workbook";
import {
  applyStoreReportColumnValueAccess,
  applyStoreReportValueAccess,
} from "../../../../modules/store/store-report-service";
import { parseStockListQuery } from "../../../../modules/store/stock-list-query";
import { loadStoreReportExportRows } from "../../../../modules/store/store-report-export-prisma";

export const preferredRegion = "home";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  const canExportStock =
    canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) ||
    canUseUserPermission(user, PermissionKey.ADJUST_STOCK);
  const canExportReports = canUseUserPermission(
    user,
    PermissionKey.VIEW_STORE_REPORTS,
  );
  const canViewStockValue = canUseUserPermission(
    user,
    PermissionKey.VIEW_STOCK_VALUE,
  );
  if (source === "stock" ? !canExportStock : !canExportReports) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const scope = await resolveStorePageScope(user, Object.fromEntries(params));
  const reportType =
    source === "stock"
      ? "STOCK_BALANCE"
      : normalizeReportType(params.get("reportType"));
  const stockQuery = parseStockListQuery(params);
  const itemKind =
    source === "stock"
      ? (stockQuery.itemKind ?? "ALL")
      : normalizeItemKind(params.get("itemKind"));
  const itemIds = params.getAll("itemIds").filter(Boolean);
  const range = dateRange(params.get("startDate"), params.get("endDate"));
  const reportRows = await loadStoreReportExportRows({
    plantId: scope.plant.id,
    reportType,
    itemKind,
    movementType: params.get("movementType") || "ALL",
    issueStatus: params.get("issueStatus") || "ALL",
    itemIds,
    search: stockQuery.search,
    storeId: stockQuery.storeId,
    typeId: stockQuery.typeId,
    categoryId: stockQuery.categoryId,
    materialGroupId: stockQuery.materialGroupId,
    unit: stockQuery.unit,
    stockStatus: stockQuery.stockStatus,
    range,
  });
  const rows = applyStoreReportValueAccess(reportRows, canViewStockValue);
  const fileBase = `store-${reportType.toLowerCase()}-${scope.plant.code}`;

  if (params.get("format") === "pdf") {
    return new NextResponse(
      printableHtml(`Store Report · ${scope.plant.code}`, rows),
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${fileBase}.html"`,
        },
      },
    );
  }

  if (reportType === "ISSUE_BY_DATE") {
    const columns = applyStoreReportColumnValueAccess(
      dailyIssueReportColumns(range),
      canViewStockValue,
    );
    const bytes = await buildDailyIssueWorkbook({
      rows,
      columns,
      title: dailyIssueReportTitle(itemKind, itemIds.length),
      dateRangeLabel: dailyIssueDateRangeLabel(range),
      sheetName:
        itemKind === "CHEMICAL" && itemIds.length === 0
          ? "Chemical Issue"
          : "Issue by Date",
    });
    return excelResponse(bytes, fileBase);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0] ?? {}).map((column) => ({
    wch: Math.max(12, Math.min(32, column.length + 4)),
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Store Report");
  const bytes = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
  return excelResponse(bytes, fileBase);
}

function excelResponse(bytes: Uint8Array | Buffer, fileBase: string) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
    },
  });
}

function dailyIssueReportTitle(
  itemKind: "ALL" | "SPARE_PART" | "CHEMICAL" | "OIL" | "FUEL",
  selectedItemCount: number,
) {
  if (selectedItemCount > 0) return "รายงานรายการเบิกที่เลือก";
  if (itemKind === "CHEMICAL") return "รายงานรายการเบิกสารเคมี";
  if (itemKind === "OIL") return "รายงานรายการเบิกน้ำมัน";
  if (itemKind === "FUEL") return "รายงานรายการเบิกเชื้อเพลิง";
  if (itemKind === "SPARE_PART") return "รายงานรายการเบิกอะไหล่";
  return "รายงานรายการเบิกทั้งหมด";
}

function dailyIssueDateRangeLabel(range: { start: Date; end: Date }) {
  const fullDate = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `ช่วงวันที่ ${fullDate.format(range.start)} – ${fullDate.format(range.end)} · ข้อมูลจากรายการเบิกที่จ่ายออกแล้ว`;
}
function normalizeReportType(value: string | null) {
  return (
    [
      "STOCK_BALANCE",
      "LOW_STOCK",
      "MOVEMENTS",
      "ISSUES",
      "ISSUE_BY_DATE",
    ].includes(String(value))
      ? value
      : "STOCK_BALANCE"
  ) as "STOCK_BALANCE" | "LOW_STOCK" | "MOVEMENTS" | "ISSUES" | "ISSUE_BY_DATE";
}

function normalizeItemKind(value: string | null) {
  return (
    ["SPARE_PART", "CHEMICAL", "OIL", "FUEL"].includes(String(value))
      ? value
      : "ALL"
  ) as "ALL" | "SPARE_PART" | "CHEMICAL" | "OIL" | "FUEL";
}

function dateRange(start: string | null, end: string | null) {
  const now = new Date();
  const startDate = start
    ? new Date(`${start}T00:00:00+07:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = end ? new Date(`${end}T23:59:59.999+07:00`) : now;
  return { start: startDate, end: endDate };
}

function printableHtml(
  title: string,
  rows: Array<Record<string, string | number>>,
) {
  const columns = Object.keys(rows[0] ?? { Result: "No data" });
  const bodyRows = rows.length ? rows : [{ Result: "No data" }];
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,"Noto Sans Thai",sans-serif;color:#0d1b3d}h1{font-size:20px}p{color:#60758a}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd9e7;padding:6px;text-align:left;vertical-align:top}th{background:#eaf1f8}.actions{margin-bottom:14px}@media print{.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button></div><h1>${escapeHtml(title)}</h1><p>${bodyRows.length} รายการ</p><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(String(row[column] ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.addEventListener('load',()=>window.print())</script></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
}
