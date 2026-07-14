import { StoreIssueStatus } from "./store-types";

const UNCATEGORIZED_LABEL = "ไม่ระบุหมวดหมู่";

export type StoreIssueReportRow = {
  id: string;
  number: string;
  status: string;
  categoryName?: string | null;
  requestedAt: Date;
};

export type StoreIssueSummary = {
  total: number;
  waitingEngineerApproval: number;
  waitingStoreIssue: number;
  issued: number;
  rejected: number;
  byCategory: Array<{ categoryName: string; total: number }>;
};

export type StockBalanceReportRow = {
  id: string;
  quantity: number;
  storeName: string;
  sparePartCode: string;
  sparePartName: string;
  unit: string;
  minStock: number;
  latestUnitPrice: number | null;
  categoryName?: string | null;
};

export type StockBalanceSummary = {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: Array<{
    id: string;
    quantity: number;
    minStock: number;
    storeName: string;
    sparePartCode: string;
    sparePartName: string;
    unit: string;
  }>;
  byCategory: Array<{
    categoryName: string;
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
  }>;
};

export type StockMovementReportRow = {
  movementType: string;
  quantityChange: number;
  occurredAt: Date;
};

export type StockMovementSummary = {
  totalMovements: number;
  receivedQuantity: number;
  issuedQuantity: number;
  adjustmentInQuantity: number;
  adjustmentOutQuantity: number;
};

export function summarizeStoreIssues(rows: StoreIssueReportRow[]): StoreIssueSummary {
  const byCategory = new Map<string, number>();
  const summary: StoreIssueSummary = {
    total: rows.length,
    waitingEngineerApproval: 0,
    waitingStoreIssue: 0,
    issued: 0,
    rejected: 0,
    byCategory: [],
  };

  for (const row of rows) {
    const categoryName = row.categoryName?.trim() || UNCATEGORIZED_LABEL;
    byCategory.set(categoryName, (byCategory.get(categoryName) ?? 0) + 1);
    if (row.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL) summary.waitingEngineerApproval += 1;
    if (row.status === StoreIssueStatus.WAITING_STORE_ISSUE) summary.waitingStoreIssue += 1;
    if (row.status === StoreIssueStatus.ISSUED) summary.issued += 1;
    if (
      row.status === StoreIssueStatus.ENGINEER_REJECTED ||
      row.status === StoreIssueStatus.STORE_REJECTED ||
      row.status === StoreIssueStatus.CANCELED
    ) {
      summary.rejected += 1;
    }
  }

  summary.byCategory = Array.from(byCategory.entries())
    .map(([categoryName, total]) => ({ categoryName, total }))
    .sort((a, b) => b.total - a.total || a.categoryName.localeCompare(b.categoryName));

  return summary;
}

export function summarizeStockBalances(rows: StockBalanceReportRow[]): StockBalanceSummary {
  const byCategory = new Map<string, { totalItems: number; totalQuantity: number; totalValue: number }>();
  const lowStockItems: StockBalanceSummary["lowStockItems"] = [];
  let totalQuantity = 0;
  let totalValue = 0;

  for (const row of rows) {
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.latestUnitPrice ?? 0);
    const value = quantity * unitPrice;
    const categoryName = row.categoryName?.trim() || UNCATEGORIZED_LABEL;
    const category = byCategory.get(categoryName) ?? { totalItems: 0, totalQuantity: 0, totalValue: 0 };

    totalQuantity += quantity;
    totalValue += value;
    category.totalItems += 1;
    category.totalQuantity += quantity;
    category.totalValue += value;
    byCategory.set(categoryName, category);

    if (quantity <= Number(row.minStock)) {
      lowStockItems.push({
        id: row.id,
        quantity,
        minStock: Number(row.minStock),
        storeName: row.storeName,
        sparePartCode: row.sparePartCode,
        sparePartName: row.sparePartName,
        unit: row.unit,
      });
    }
  }

  return {
    totalItems: rows.length,
    totalQuantity,
    totalValue,
    lowStockItems: lowStockItems.sort((a, b) => a.quantity - b.quantity || a.sparePartName.localeCompare(b.sparePartName)),
    byCategory: Array.from(byCategory.entries())
      .map(([categoryName, value]) => ({ categoryName, ...value }))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "en-US")),
  };
}

export function summarizeStockMovements(rows: StockMovementReportRow[]): StockMovementSummary {
  const summary: StockMovementSummary = {
    totalMovements: rows.length,
    receivedQuantity: 0,
    issuedQuantity: 0,
    adjustmentInQuantity: 0,
    adjustmentOutQuantity: 0,
  };

  for (const row of rows) {
    const quantity = Number(row.quantityChange);
    if (row.movementType === "RECEIVE") summary.receivedQuantity += Math.abs(quantity);
    if (row.movementType === "ISSUE") summary.issuedQuantity += Math.abs(quantity);
    if (row.movementType === "ADJUSTMENT" && quantity > 0) summary.adjustmentInQuantity += quantity;
    if (row.movementType === "ADJUSTMENT" && quantity < 0) summary.adjustmentOutQuantity += Math.abs(quantity);
  }

  return summary;
}

export function buildStoreIssueLineMessage(input: {
  eventType: string;
  issueNumber: string;
  statusLabel: string;
  requesterName: string;
  siteName: string;
  itemCount: number;
}) {
  return [
    "[PowerCare.CM]",
    `เลขที่เบิก: ${input.issueNumber}`,
    `สถานะ: ${input.statusLabel}`,
    `Site: ${input.siteName}`,
    `ผู้ขอเบิก: ${input.requesterName}`,
    `จำนวนรายการ: ${input.itemCount}`,
  ].join("\n");
}
