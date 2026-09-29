import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: { findMany: vi.fn() },
  sparePartCategory: { findMany: vi.fn() },
  sparePartMaterialGroup: { findMany: vi.fn() },
  sparePartType: { findMany: vi.fn() },
  storeApplicableZone: { findMany: vi.fn() },
  sparePart: { findMany: vi.fn() },
  findStockBalanceRows: vi.fn(),
  stockReadFiltersFromListQuery: vi.fn(),
}));

vi.mock("../../lib/db", () => ({ db: mocks }));
vi.mock("./stock-read-service", () => ({
  findStockBalanceRows: mocks.findStockBalanceRows,
  stockReadFiltersFromListQuery: mocks.stockReadFiltersFromListQuery,
}));

import { loadStockPageData } from "./stock-page-data";

const query = {
  search: "seal",
  storeId: "store-1",
  typeId: "type-1",
  categoryId: "category-1",
  materialGroupId: "group-1",
  itemKind: "SPARE_PART" as const,
  unit: "PCS",
  stockStatus: "nearMin" as const,
  page: 2,
};

describe("Stock page data loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.findMany.mockResolvedValue(["store"]);
    mocks.sparePartCategory.findMany.mockResolvedValue(["category"]);
    mocks.sparePartMaterialGroup.findMany.mockResolvedValue(["group"]);
    mocks.sparePartType.findMany.mockResolvedValue(["type"]);
    mocks.storeApplicableZone.findMany.mockResolvedValue(["zone"]);
    mocks.sparePart.findMany
      .mockResolvedValueOnce(["unit"])
      .mockResolvedValueOnce(["suggestion"]);
    mocks.stockReadFiltersFromListQuery.mockReturnValue({ status: "filters" });
    mocks.findStockBalanceRows.mockResolvedValue(["stock"]);
  });

  it("loads Stock reference data and balances for one plant", async () => {
    await expect(loadStockPageData("plant-1", query)).resolves.toEqual({
      stores: ["store"],
      categories: ["category"],
      materialGroups: ["group"],
      sparePartTypes: ["type"],
      issueZones: ["zone"],
      units: ["unit"],
      stocks: ["stock"],
      searchSuggestions: ["suggestion"],
    });

    expect(mocks.stockReadFiltersFromListQuery).toHaveBeenCalledWith(query);
    expect(mocks.findStockBalanceRows).toHaveBeenCalledWith({
      plantId: "plant-1",
      filters: { status: "filters" },
    });
    expect(mocks.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { plantId: "plant-1", active: true } }),
    );
    expect(mocks.storeApplicableZone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          plantId: "plant-1",
          active: true,
          zone: { active: true },
        },
      }),
    );
  });
});
