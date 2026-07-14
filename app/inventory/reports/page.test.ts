import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store reports page", () => {
  it("exists and renders Store report sections with low-stock visibility", () => {
    expect(existsSync("app/inventory/reports/page.tsx")).toBe(true);
    const source = readFileSync("app/inventory/reports/page.tsx", "utf8");

    expect(source).toContain("Store Reports");
    expect(source).toContain("Low Stock");
    expect(source).toContain("Stock Balance");
    expect(source).toContain("Receive / Issue");
    expect(source).toContain("summarizeStockBalances");
    expect(source).toContain("summarizeStockMovements");
    expect(source).toContain("VIEW_STORE_REPORTS");
    expect(source).toContain("resolveStorePageScope");
  });
});
