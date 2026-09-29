import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store report export route", () => {
  it("supports scoped Excel and printable PDF exports", () => {
    expect(existsSync("app/dashboardstore/reports/export/route.ts")).toBe(true);
    const routeSource = readFileSync(
      "app/dashboardstore/reports/export/route.ts",
      "utf8",
    );
    const querySource = readFileSync(
      "modules/store/store-report-export-prisma.ts",
      "utf8",
    );
    const source = `${routeSource}\n${querySource}`;

    expect(source).toContain("VIEW_STORE_REPORTS");
    expect(source).toContain("VIEW_STORE_STOCK");
    expect(source).toContain("VIEW_STOCK_VALUE");
    expect(source).toContain("applyStoreReportValueAccess");
    expect(source).toContain("applyStoreReportColumnValueAccess");
    expect(routeSource).toContain("loadStoreReportExportRows");
    expect(routeSource).not.toContain("db.stockMovement.findMany");
    expect(source).toContain('source === "stock"');
    expect(source).toContain("parseStockListQuery(params)");
    expect(source).toContain("stockQuery.materialGroupId");
    expect(source).toContain("stockQuery.storeId");
    expect(source).toContain("stockQuery.typeId");
    expect(source).toContain("stockQuery.unit");
    expect(source).toContain("stockQuery.stockStatus");
    expect(source).toContain("buildStockSparePartWhere");
    expect(source).toContain("buildStockBalanceWhere");
    expect(source).toContain("findStockBalanceRows({");
    expect(source).toContain("matchesStockStatus(");
    expect(source).toContain("sparePartWhere");
    expect(source).toContain("matchingStockKeys");
    expect(source).not.toContain('input.stockStatus === "nearMin"');
    expect(source).toContain('"Received Quantity"');
    expect(source).toContain('"Issued Quantity"');
    expect(source).toContain('"Total Value"');
    expect(source).toContain("resolveStorePageScope");
    expect(source).toContain("STOCK_BALANCE");
    expect(source).toContain("LOW_STOCK");
    expect(source).toContain("MOVEMENTS");
    expect(source).toContain("ISSUES");
    expect(source).toContain("ISSUE_BY_DATE");
    expect(source).toContain('params.getAll("itemIds")');
    expect(source).toContain('movementType: { in: ["RECEIVE", "ISSUE"] }');
    expect(source).toContain("summarizePeriodMovementQuantities");
    expect(source).toContain("stockQuantities");
    expect(source).toContain("buildDailyIssueReportRows");
    expect(source).toContain("dailyIssueReportColumns");
    expect(source).toContain("buildDailyIssueWorkbook");
    expect(source).toContain("dailyIssueReportTitle");
    expect(source).toContain("dailyIssueDateRangeLabel");
    expect(source).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(source).toContain("พิมพ์ / บันทึกเป็น PDF");
  });
});
