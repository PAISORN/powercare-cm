import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storeStock: { findMany: vi.fn() },
  stockMovement: { findMany: vi.fn() },
  sparePartIssue: { findMany: vi.fn() },
  sparePart: { findMany: vi.fn() },
  store: { findMany: vi.fn() },
  sparePartCategory: { findMany: vi.fn() },
  sparePartMaterialGroup: { findMany: vi.fn() },
  sparePartType: { findMany: vi.fn() },
}));

vi.mock("../../lib/db", () => ({ db: mocks }));

describe("Store report page data", () => {
  const range = {
    start: new Date("2026-09-01T00:00:00.000Z"),
    end: new Date("2026-09-30T23:59:59.999Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeStock.findMany.mockResolvedValue([
      {
        id: "stock-1",
        quantity: 2,
        store: { code: "MAIN", name: "Main Store" },
        sparePart: {
          code: "SP-001",
          itemCode: "ITEM-001",
          name: "Seal",
          unit: "PCS",
          minStock: 3,
          latestUnitPrice: 50,
          category: { name: "Mechanical" },
        },
      },
    ]);
    mocks.stockMovement.findMany.mockResolvedValue([]);
    mocks.sparePartIssue.findMany.mockResolvedValue([]);
    mocks.sparePart.findMany
      .mockResolvedValueOnce([
        {
          id: "part-1",
          code: "SP-001",
          itemCode: "ITEM-001",
          itemKind: "SPARE_PART",
          name: "Seal",
          typeId: "type-1",
          categoryId: "category-1",
          materialGroupId: "group-1",
          unit: "PCS",
          minStock: 3,
          stocks: [{ storeId: "store-1", quantity: 2 }],
        },
      ])
      .mockResolvedValueOnce([{ unit: "PCS" }]);
    mocks.store.findMany.mockResolvedValue([]);
    mocks.sparePartCategory.findMany.mockResolvedValue([]);
    mocks.sparePartMaterialGroup.findMany.mockResolvedValue([]);
    mocks.sparePartType.findMany.mockResolvedValue([]);
  });

  it("uses one Site and date range for every report section", async () => {
    const { loadStoreReportPageData } =
      await import("./store-report-page-data");

    await loadStoreReportPageData("site-1", range, true);

    expect(mocks.storeStock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { plantId: "site-1" } }),
    );
    expect(mocks.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          plantId: "site-1",
          occurredAt: { gte: range.start, lte: range.end },
        },
      }),
    );
    expect(mocks.sparePartIssue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          plantId: "site-1",
          requestedAt: { gte: range.start, lte: range.end },
        },
      }),
    );
  });

  it("does not expose stock values in the page model without permission", async () => {
    const { loadStoreReportPageData } =
      await import("./store-report-page-data");

    const hidden = await loadStoreReportPageData("site-1", range, false);

    expect(hidden.stockSummary.totalQuantity).toBe(2);
    expect(hidden.stockSummary.totalValue).toBe(0);
    expect(hidden.stockSummary.byCategory).toEqual([
      {
        categoryName: "Mechanical",
        totalItems: 1,
        totalQuantity: 2,
        totalValue: 0,
      },
    ]);
  });
});
