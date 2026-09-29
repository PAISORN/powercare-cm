import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storeStock: { findMany: vi.fn() },
}));

vi.mock("../../lib/db", () => ({ db: mocks }));

import {
  buildStockBalanceWhere,
  findStockBalanceRows,
  matchesStockStatus,
  stockReadFiltersFromListQuery,
} from "./stock-read-service";

const filters = {
  search: "seal",
  storeId: "store-1",
  typeId: "type-1",
  categoryId: "category-1",
  materialGroupId: "group-1",
  itemKind: "SPARE_PART" as const,
  unit: "PCS",
  stockStatus: "nearMin" as const,
};

describe("Stock read service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds one plant-scoped database filter for every Stock list field", () => {
    expect(buildStockBalanceWhere("plant-1", filters)).toEqual({
      plantId: "plant-1",
      storeId: "store-1",
      store: { plantId: "plant-1", active: true },
      sparePart: {
        plantId: "plant-1",
        active: true,
        itemKind: "SPARE_PART",
        typeId: "type-1",
        categoryId: "category-1",
        materialGroupId: "group-1",
        unit: "PCS",
        OR: [
          { code: { contains: "seal" } },
          { itemCode: { contains: "seal" } },
          { name: { contains: "seal" } },
        ],
      },
    });
  });

  it("uses the same minimum-stock boundaries for page and export filtering", () => {
    expect(matchesStockStatus(11, 10, "available")).toBe(true);
    expect(matchesStockStatus(10, 10, "available")).toBe(false);
    expect(matchesStockStatus(10, 10, "nearMin")).toBe(true);
    expect(matchesStockStatus(0, 10, "nearMin")).toBe(false);
    expect(matchesStockStatus(0, 10, "outOfStock")).toBe(true);
    expect(matchesStockStatus(-1, 10, "outOfStock")).toBe(true);
    expect(matchesStockStatus(20, 10, "all")).toBe(true);
  });

  it("reads and filters balance rows inside the shared service", async () => {
    mocks.storeStock.findMany.mockResolvedValue([
      { quantity: 5, sparePart: { minStock: 10 } },
      { quantity: 0, sparePart: { minStock: 10 } },
      { quantity: 11, sparePart: { minStock: 10 } },
    ]);

    const rows = await findStockBalanceRows({ plantId: "plant-1", filters });

    expect(rows).toEqual([{ quantity: 5, sparePart: { minStock: 10 } }]);
    expect(mocks.storeStock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildStockBalanceWhere("plant-1", filters),
      }),
    );
  });

  it("maps the canonical list query into read filters without its page", () => {
    expect(
      stockReadFiltersFromListQuery({ ...filters, itemKind: undefined, page: 4 }),
    ).toEqual({ ...filters, itemKind: "ALL" });
  });
});
