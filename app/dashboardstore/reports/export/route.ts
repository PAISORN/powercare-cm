import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../../modules/store/store-page-scope";
import { db } from "../../../../lib/db";
import { buildDailyIssueReportRows, dailyIssueReportColumns } from "../../../../modules/store/store-daily-issue-report";

export const preferredRegion = "home";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  const canExportStock =
    canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) ||
    canUseUserPermission(user, PermissionKey.ADJUST_STOCK);
  const canExportReports = canUseUserPermission(user, PermissionKey.VIEW_STORE_REPORTS);
  if (source === "stock" ? !canExportStock : !canExportReports) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const scope = await resolveStorePageScope(user, Object.fromEntries(params));
  const reportType = source === "stock" ? "STOCK_BALANCE" : normalizeReportType(params.get("reportType"));
  const itemKind = normalizeItemKind(params.get("itemKind"));
  const range = dateRange(params.get("startDate"), params.get("endDate"));
  const rows = await exportRows({
    plantId: scope.plant.id,
    reportType,
    itemKind,
    movementType: params.get("movementType") || "ALL",
    issueStatus: params.get("issueStatus") || "ALL",
    itemIds: params.getAll("itemIds").filter(Boolean),
    search: params.get("search")?.trim() || "",
    storeId: params.get("storeId") || "",
    typeId: params.get("typeId") || "",
    categoryId: params.get("categoryId") || "",
    materialGroupId: params.get("materialGroupId") || "",
    unit: params.get("unit") || "",
    stockStatus: params.get("stockStatus") || "all",
    range,
  });
  const fileBase = `store-${reportType.toLowerCase()}-${scope.plant.code}`;

  if (params.get("format") === "pdf") {
    return new NextResponse(printableHtml(`Store Report · ${scope.plant.code}`, rows), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `inline; filename="${fileBase}.html"` },
    });
  }

  const workbook = XLSX.utils.book_new();
  const headers = reportType === "ISSUE_BY_DATE" ? dailyIssueReportColumns(range) : undefined;
  const worksheet = XLSX.utils.json_to_sheet(rows, headers ? { header: headers } : undefined);
  worksheet["!cols"] = (headers ?? Object.keys(rows[0] ?? {})).map((column) => ({ wch: column.startsWith("วันที่ ") ? 16 : Math.max(12, Math.min(32, column.length + 4)) }));
  XLSX.utils.book_append_sheet(workbook, worksheet, reportType === "ISSUE_BY_DATE" ? "Issue by Date" : "Store Report");
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
  reportType: "STOCK_BALANCE" | "LOW_STOCK" | "MOVEMENTS" | "ISSUES" | "ISSUE_BY_DATE";
  itemKind: "ALL" | "SPARE_PART" | "CHEMICAL" | "OIL" | "FUEL";
  movementType: string;
  issueStatus: string;
  itemIds: string[];
  search: string;
  storeId: string;
  typeId: string;
  categoryId: string;
  materialGroupId: string;
  unit: string;
  stockStatus: string;
  range: { start: Date; end: Date };
}) {
  const kindWhere = input.itemKind === "ALL" ? {} : { itemKind: input.itemKind };
  if (input.reportType === "STOCK_BALANCE" || input.reportType === "LOW_STOCK") {
    const stocks = await db.storeStock.findMany({
      where: {
        plantId: input.plantId,
        ...(input.storeId ? { storeId: input.storeId } : {}),
        store: { active: true },
        sparePart: {
          ...kindWhere,
          active: true,
          ...(input.typeId ? { typeId: input.typeId } : {}),
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input.materialGroupId ? { materialGroupId: input.materialGroupId } : {}),
          ...(input.unit ? { unit: input.unit } : {}),
          ...(input.search
            ? {
                OR: [
                  { code: { contains: input.search } },
                  { itemCode: { contains: input.search } },
                  { name: { contains: input.search } },
                ],
              }
            : {}),
        },
      },
      include: { store: true, sparePart: { include: { category: true, materialGroup: true } } },
      orderBy: [{ store: { code: "asc" } }, { sparePart: { code: "asc" } }],
    });
    return stocks
      .filter((stock) => {
        const quantity = Number(stock.quantity);
        const minimum = Number(stock.sparePart.minStock);
        if (input.reportType === "LOW_STOCK" && quantity > minimum) return false;
        if (input.stockStatus === "available") return quantity > minimum;
        if (input.stockStatus === "nearMin") return quantity > 0 && quantity <= minimum;
        if (input.stockStatus === "outOfStock") return quantity <= 0;
        return true;
      })
      .map((stock) => ({
        "Store Code": stock.store.code,
        "Store Name": stock.store.name,
        "Item Type": stock.sparePart.itemKind,
        "Item Code": stock.sparePart.code,
        "Item Name": stock.sparePart.name,
        Category: stock.sparePart.category?.name ?? "-",
        "Material Group": stock.sparePart.materialGroup?.name ?? "-",
        Quantity: Number(stock.quantity),
        Minimum: Number(stock.sparePart.minStock),
        Unit: stock.sparePart.unit,
        "Unit Price": stock.sparePart.latestUnitPrice == null ? "" : Number(stock.sparePart.latestUnitPrice),
        "Total Value": Number(stock.quantity) * Number(stock.sparePart.latestUnitPrice ?? 0),
      }));
  }
  if (input.reportType === "ISSUE_BY_DATE") {
    const selectedItemWhere = input.itemIds.length ? { id: { in: input.itemIds } } : kindWhere;
    const movements = await db.stockMovement.findMany({
      where: {
        plantId: input.plantId,
        movementType: "ISSUE",
        occurredAt: { gte: input.range.start, lte: input.range.end },
        sparePart: selectedItemWhere,
      },
      include: {
        store: { select: { id: true, code: true, name: true } },
        sparePart: {
          select: {
            id: true,
            itemKind: true,
            code: true,
            itemCode: true,
            name: true,
            unit: true,
            minStock: true,
            latestUnitPrice: true,
            category: { select: { name: true } },
            materialGroup: { select: { name: true } },
          },
        },
      },
      orderBy: [{ occurredAt: "asc" }, { store: { code: "asc" } }, { sparePart: { code: "asc" } }],
    });
    return buildDailyIssueReportRows(movements.map((movement) => ({
      occurredAt: movement.occurredAt,
      quantityChange: Number(movement.quantityChange),
      unitPrice: movement.unitPrice == null ? null : Number(movement.unitPrice),
      store: movement.store,
      sparePart: {
        id: movement.sparePart.id,
        itemKind: movement.sparePart.itemKind,
        code: movement.sparePart.code,
        itemCode: movement.sparePart.itemCode,
        name: movement.sparePart.name,
        unit: movement.sparePart.unit,
        minStock: Number(movement.sparePart.minStock),
        latestUnitPrice: movement.sparePart.latestUnitPrice == null ? null : Number(movement.sparePart.latestUnitPrice),
        categoryName: movement.sparePart.category?.name ?? null,
        materialGroupName: movement.sparePart.materialGroup?.name ?? null,
      },
    })), input.range);
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
  return (["STOCK_BALANCE", "LOW_STOCK", "MOVEMENTS", "ISSUES", "ISSUE_BY_DATE"].includes(String(value)) ? value : "STOCK_BALANCE") as "STOCK_BALANCE" | "LOW_STOCK" | "MOVEMENTS" | "ISSUES" | "ISSUE_BY_DATE";
}

function normalizeItemKind(value: string | null) {
  return (["SPARE_PART", "CHEMICAL", "OIL", "FUEL"].includes(String(value)) ? value : "ALL") as "ALL" | "SPARE_PART" | "CHEMICAL" | "OIL" | "FUEL";
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
