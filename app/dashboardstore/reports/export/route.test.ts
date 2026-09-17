import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store report export route", () => {
  it("supports scoped Excel and printable PDF exports", () => {
    expect(existsSync("app/dashboardstore/reports/export/route.ts")).toBe(true);
    const source = readFileSync("app/dashboardstore/reports/export/route.ts", "utf8");

    expect(source).toContain("VIEW_STORE_REPORTS");
    expect(source).toContain("VIEW_STORE_STOCK");
    expect(source).toContain('source === "stock"');
    expect(source).toContain('params.get("materialGroupId")');
    expect(source).toContain('params.get("storeId")');
    expect(source).toContain('params.get("typeId")');
    expect(source).toContain('params.get("unit")');
    expect(source).toContain('params.get("stockStatus")');
    expect(source).toContain("sparePartWhere");
    expect(source).toContain("matchingStockKeys");
    expect(source).toContain('input.stockStatus === "nearMin"');
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
    expect(source).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(source).toContain("พิมพ์ / บันทึกเป็น PDF");
  });
});
