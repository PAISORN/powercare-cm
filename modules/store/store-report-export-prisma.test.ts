import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storeStock: { findMany: vi.fn() },
  stockMovement: { findMany: vi.fn() },
  sparePartIssue: { findMany: vi.fn() },
}));

vi.mock("../../lib/db", () => ({ db: mocks }));

describe("Store report export query", () => {
  const range = {
    start: new Date("2026-09-01T00:00:00.000Z"),
    end: new Date("2026-09-30T23:59:59.999Z"),
  };
  const input = {
    plantId: "site-1",
    reportType: "STOCK_BALANCE" as const,
    itemKind: "SPARE_PART" as const,
    movementType: "ALL",
    issueStatus: "ALL",
    itemIds: [],
    search: "seal",
    storeId: "store-1",
    typeId: "type-1",
    categoryId: "category-1",
    materialGroupId: "group-1",
    unit: "PCS",
    stockStatus: "all" as const,
    range,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeStock.findMany.mockResolvedValue([
      {
        id: "stock-1",
        storeId: "store-1",
        sparePartId: "part-1",
        quantity: 2,
        store: {
          id: "store-1",
          code: "MAIN",
          name: "Main Store",
          location: null,
          category: null,
        },
        sparePart: {
          id: "part-1",
          code: "SP-001",
          itemCode: "ITEM-001",
          itemKind: "SPARE_PART",
          name: "Seal",
          description: null,
          unit: "PCS",
          minStock: 3,
          maxStock: 10,
          latestUnitPrice: 50,
          reorderPoint: 4,
          categoryId: "category-1",
          materialGroupId: "group-1",
          typeId: "type-1",
          defaultStoreId: "store-1",
          active: true,
          category: { name: "Mechanical" },
          materialGroup: { name: "Seals" },
          type: { code: "EXP", name: "Expense" },
        },
      },
    ]);
    mocks.stockMovement.findMany.mockResolvedValue([
      {
        movementType: "RECEIVE",
        quantityChange: 4,
        store: { id: "store-1" },
        sparePart: { id: "part-1" },
      },
      {
        movementType: "ISSUE",
        quantityChange: -2,
        store: { id: "store-1" },
        sparePart: { id: "part-1" },
      },
    ]);
  });

  it("applies the selected Site and Stock filters to balance exports", async () => {
    const { loadStoreReportExportRows } =
      await import("./store-report-export-prisma");

    const rows = await loadStoreReportExportRows(input);

    expect(mocks.storeStock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          plantId: "site-1",
          storeId: "store-1",
          store: { plantId: "site-1", active: true },
          sparePart: expect.objectContaining({
            plantId: "site-1",
            active: true,
            itemKind: "SPARE_PART",
            typeId: "type-1",
            categoryId: "category-1",
            materialGroupId: "group-1",
            unit: "PCS",
          }),
        }),
      }),
    );
    expect(mocks.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          plantId: "site-1",
          storeId: "store-1",
          occurredAt: { gte: range.start, lte: range.end },
        }),
      }),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        "Store Code": "MAIN",
        "Item Code": "SP-001",
        "Received Quantity": 4,
        "Issued Quantity": 2,
        Quantity: 2,
        "Unit Price": 50,
        "Total Value": 100,
      }),
    ]);
  });
});
