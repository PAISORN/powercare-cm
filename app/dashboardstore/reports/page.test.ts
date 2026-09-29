import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store reports page", () => {
  it("exists and renders Store report sections with low-stock visibility", () => {
    expect(existsSync("app/dashboardstore/reports/page.tsx")).toBe(true);
    const source = readFileSync("app/dashboardstore/reports/page.tsx", "utf8");

    expect(source).toContain("Store Reports");
    expect(source).toContain("Low Stock");
    expect(source).toContain("Stock Balance");
    expect(source).toContain("Receive / Issue");
    expect(source).toContain("loadStoreReportPageData");
    expect(source).toContain("VIEW_STORE_REPORTS");
    expect(source).toContain("VIEW_STOCK_VALUE");
    expect(source).toContain("resolveStorePageScope");
    expect(source).toContain('action="/dashboardstore/reports/export"');
    expect(source).toContain("StoreReportItemPicker");
    expect(source).toContain("items={exportItems}");
    expect(source).toContain("stores={stores}");
    expect(source).toContain("types={sparePartTypes}");
    expect(source).toContain("categories={categories}");
    expect(source).toContain("materialGroups={materialGroups}");
    expect(source).toContain("units={units.map");
    expect(source).toContain("canViewStockValue");
    expect(source).not.toContain("db.storeStock.findMany");

    expect(source).toContain('name="movementType"');
    expect(source).toContain('name="issueStatus"');
    expect(source).toContain('value="xlsx"');
    expect(source).toContain('value="pdf"');
  });
});
