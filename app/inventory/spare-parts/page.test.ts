import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Spare parts page", () => {
  it("supports inventory fields used by the stock table", () => {
    expect(existsSync("app/inventory/spare-parts/page.tsx")).toBe(true);
    const source = readFileSync("app/inventory/spare-parts/page.tsx", "utf8");

    expect(source).toContain('name="itemCode"');
    expect(source).toContain('name="description"');
    expect(source).toContain('name="unit"');
    expect(source).toContain('name="minStock"');
    expect(source).toContain('name="maxStock"');
    expect(source).toContain('name="reorderPoint"');
    expect(source).toContain('name="defaultStoreId"');
    expect(source).toContain('name="typeId"');
    expect(source).toContain('name="storageZoneId"');
    expect(source).toContain("Spare Parts Master Data");
    expect(source).toContain("saveSparePartCategory");
    expect(source).toContain("saveSparePartType");
    expect(source).toContain("saveStorageZone");
    expect(source).toContain("saveStore");
    expect(source).toContain("maxStock: optionalNumber");
    expect(source).toContain("editPartId");
    expect(source).toContain("updateSparePart");
    expect(source).toContain("<table");
    expect(source).toContain("<aside");
    expect(source).toContain("MoreVertical");
    expect(source).toContain('StockHeaderReplacementController regionId="spare-parts-table-region"');
    expect(source).toContain("data-stock-replacement-header");
    expect(source).toContain("data-stock-table-scroll");
    expect(source).toContain("data-stock-table-header");
    expect(source).toContain("SparePartsTableColGroup");
    expect(source).toContain("SparePartsTableHeaderRow");
    expect(source).toContain("sticky top-0 z-40 bg-[var(--soft)]");
  });
});
