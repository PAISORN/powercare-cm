import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory movements page", () => {
  it("adds a dedicated stock movement page under Inventory", () => {
    expect(existsSync("app/inventory/movements/page.tsx")).toBe(true);
    const source = readFileSync("app/inventory/movements/page.tsx", "utf8");

    expect(source).toContain("Home &gt; Inventory &gt; Stock Movement");
    expect(source).toContain("Stock Movement ล่าสุด");
    expect(source).toContain("db.stockMovement.findMany");
    expect(source).toContain("VIEW_STORE_STOCK");
    expect(source).toContain('StockHeaderReplacementController regionId="stock-movement-table-region"');
    expect(source).toContain("data-stock-table-header");
    expect(source).toContain("data-stock-replacement-header");
    expect(source).toContain("const pageSize = 50");
    expect(source).toContain("Stock movement pagination");
    expect(source).toContain("skip: (currentPage - 1) * pageSize");
  });
});
