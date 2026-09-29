import { describe, expect, it } from "vitest";
import type { SparePartsPageData } from "./spare-parts-page-data";
import { buildSparePartsPageModel } from "./spare-parts-page-model";

function fixtureData(count = 51) {
  return {
    plantConfig: { inventoryCode: "RTB" },
    stores: [{ id: "store-1", active: true, name: "Main Store" }],
    partCategories: [{ id: "category-1", active: true, name: "Mechanical" }],
    materialGroups: [
      {
        id: "group-1",
        active: true,
        categoryId: "category-1",
        name: "Seals",
      },
    ],
    partTypes: [{ id: "type-1", active: true, name: "Expense" }],
    zones: [],
    storeApplicableZones: [],
    spareParts: Array.from({ length: count }, (_, index) => ({
      id: `part-${index + 1}`,
      code: `SP-${String(index + 1).padStart(3, "0")}`,
      itemCode: `ITEM-${index + 1}`,
      name: index === 50 ? "Final Seal" : `Seal ${index + 1}`,
      description: null,
      unit: "PCS",
      active: index !== 1,
      minStock: 3,
      latestUnitPrice: 25,
      defaultStoreId: "store-1",
      categoryId: "category-1",
      materialGroupId: "group-1",
      typeId: "type-1",
      stocks: [{ quantity: index === 0 ? 2 : 5 }],
    })),
  } as unknown as SparePartsPageData;
}

describe("Spare Parts page model", () => {
  it("puts item 51 on page 2 with a 50-item boundary", () => {
    const model = buildSparePartsPageModel(fixtureData(), {
      partsPage: "2",
    });

    expect(model.totalSparePartsPages).toBe(2);
    expect(model.firstVisibleSparePartIndex).toBe(50);
    expect(model.visibleSpareParts.map((part) => part.id)).toEqual(["part-51"]);
  });

  it("applies filters before pagination and builds inventory summaries", () => {
    const model = buildSparePartsPageModel(fixtureData(), {
      search: "final",
      storeId: "store-1",
      categoryId: "category-1",
    });

    expect(model.filteredSpareParts.map((part) => part.id)).toEqual([
      "part-51",
    ]);
    expect(model.currentSparePartsPage).toBe(1);
    expect(model.activeFilterCount).toBe(3);
    expect(model.activePartCount).toBe(50);
    expect(model.lowStockPartCount).toBe(1);
    expect(model.totalPartValue).toBe(6300);
    expect(model.categoryRows).toEqual([
      { id: "category-1", name: "Mechanical", count: 51 },
    ]);
  });
});
