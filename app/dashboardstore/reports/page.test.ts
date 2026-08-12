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
    expect(source).toContain("summarizeStockBalances");
    expect(source).toContain("summarizeStockMovements");
    expect(source).toContain("VIEW_STORE_REPORTS");
    expect(source).toContain("resolveStorePageScope");
    expect(source).toContain('action="/dashboardstore/reports/export"');
    expect(source).toContain('name="reportType"');
    expect(source).toContain('name="itemKind"');
    expect(source).toContain('name="movementType"');
    expect(source).toContain('name="issueStatus"');
    expect(source).toContain('value="xlsx"');
    expect(source).toContain('value="pdf"');
  });
});
