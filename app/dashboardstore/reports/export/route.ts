import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../../modules/store/store-page-scope";
import { db } from "../../../../lib/db";

export const preferredRegion = "home";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!canUseUserPermission(user, PermissionKey.VIEW_STORE_REPORTS)) return new NextResponse("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const scope = await resolveStorePageScope(user, Object.fromEntries(params));
  const reportType = normalizeReportType(params.get("reportType"));
  const itemKind = normalizeItemKind(params.get("itemKind"));
  const range = dateRange(params.get("startDate"), params.get("endDate"));
  const rows = await exportRows({
    plantId: scope.plant.id,
    reportType,
    itemKind,
    movementType: params.get("movementType") || "ALL",
    issueStatus: params.get("issueStatus") || "ALL",
    range,
  });
  const fileBase = `store-${reportType.toLowerCase()}-${scope.plant.code}`;

  if (params.get("format") === "pdf") {
    return new NextResponse(printableHtml(`Store Report · ${scope.plant.code}`, rows), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `inline; filename="${fileBase}.html"` },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Store Report");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
    },
  });
}

async function exportRows(input: {
  plantId: string;
  reportType: "STOCK_BALANCE" | "LOW_STOCK" | "MOVEMENTS" | "ISSUES";
  itemKind: "ALL" | "SPARE_PART" | "CHEMICAL" | "OIL";
  movementType: string;
  issueStatus: string;
  range: { start: Date; end: Date };
}) {
  const kindWhere = input.itemKind === "ALL" ? {} : { itemKind: input.itemKind };
  if (input.reportType === "STOCK_BALANCE" || input.reportType === "LOW_STOCK") {
    const stocks = await db.storeStock.findMany({
      where: { plantId: input.plantId, sparePart: kindWhere },
      include: { store: true, sparePart: { include: { category: true } } },
      orderBy: [{ store: { code: "asc" } }, { sparePart: { code: "asc" } }],
    });
    return stocks
      .filter((stock) => input.reportType !== "LOW_STOCK" || Number(stock.quantity) <= Number(stock.sparePart.minStock))
      .map((stock) => ({
        "Store Code": stock.store.code,
        "Store Name": stock.store.name,
        "Item Type": stock.sparePart.itemKind,
        "Item Code": stock.sparePart.code,
        "Item Name": stock.sparePart.name,
        Category: stock.sparePart.category?.name ?? "-",
        Quantity: Number(stock.quantity),
        Minimum: Number(stock.sparePart.minStock),
        Unit: stock.sparePart.unit,
        "Unit Price": stock.sparePart.latestUnitPrice == null ? "" : Number(stock.sparePart.latestUnitPrice),
      }));
  }
  if (input.reportType === "MOVEMENTS") {
    const movements = await db.stockMovement.findMany({
      where: {
        plantId: input.plantId,
        occurredAt: { gte: input.range.start, lte: input.range.end },
        ...(input.movementType === "ALL" ? {} : { movementType: input.movementType as never }),
        sparePart: kindWhere,
      },
      include: { store: true, sparePart: true, actor: true },
      orderBy: { occurredAt: "desc" },
    });
    return movements.map((movement) => ({
      Date: movement.occurredAt.toISOString(),
      Type: movement.movementType,
      "Item Type": movement.sparePart.itemKind,
      "Item Code": movement.sparePart.code,
      "Item Name": movement.sparePart.name,
      Store: movement.store.code,
      Quantity: Number(movement.quantityChange),
      Unit: movement.sparePart.unit,
      Actor: movement.actor?.fullName ?? "-",
      Note: movement.note ?? "",
    }));
  }
  const issues = await db.sparePartIssue.findMany({
    where: {
      plantId: input.plantId,
      requestedAt: { gte: input.range.start, lte: input.range.end },
      ...(input.issueStatus === "ALL" ? {} : { status: input.issueStatus as never }),
      ...(input.itemKind === "ALL" ? {} : { itemKind: input.itemKind }),
    },
    include: { requesterUser: true, items: { include: { sparePart: true, store: true } } },
    orderBy: { requestedAt: "desc" },
  });
  return issues.flatMap((issue) => issue.items.map((item) => ({
    "Issue Number": issue.number,
    Date: issue.requestedAt.toISOString(),
    Status: issue.status,
    Requester: issue.requesterUser?.fullName ?? issue.requesterName,
    "Item Type": item.sparePart.itemKind,
    "Item Code": item.sparePart.code,
    "Item Name": item.sparePart.name,
    Store: item.store?.code ?? "-",
    Requested: Number(item.requestedQty),
    Approved: item.approvedQty == null ? "" : Number(item.approvedQty),
    Issued: item.issuedQty == null ? "" : Number(item.issuedQty),
    Unit: item.sparePart.unit,
  })));
}

function normalizeReportType(value: string | null) {
  return (["STOCK_BALANCE", "LOW_STOCK", "MOVEMENTS", "ISSUES"].includes(String(value)) ? value : "STOCK_BALANCE") as "STOCK_BALANCE" | "LOW_STOCK" | "MOVEMENTS" | "ISSUES";
}

function normalizeItemKind(value: string | null) {
  return (["SPARE_PART", "CHEMICAL", "OIL"].includes(String(value)) ? value : "ALL") as "ALL" | "SPARE_PART" | "CHEMICAL" | "OIL";
}

function dateRange(start: string | null, end: string | null) {
  const now = new Date();
  const startDate = start ? new Date(`${start}T00:00:00+07:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = end ? new Date(`${end}T23:59:59.999+07:00`) : now;
  return { start: startDate, end: endDate };
}

function printableHtml(title: string, rows: Array<Record<string, string | number>>) {
  const columns = Object.keys(rows[0] ?? { Result: "No data" });
  const bodyRows = rows.length ? rows : [{ Result: "No data" }];
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,"Noto Sans Thai",sans-serif;color:#0d1b3d}h1{font-size:20px}p{color:#60758a}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd9e7;padding:6px;text-align:left;vertical-align:top}th{background:#eaf1f8}.actions{margin-bottom:14px}@media print{.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button></div><h1>${escapeHtml(title)}</h1><p>${bodyRows.length} รายการ</p><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(String(row[column] ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.addEventListener('load',()=>window.print())</script></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
