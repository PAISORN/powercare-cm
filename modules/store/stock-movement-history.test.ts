import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storeStock: { findFirst: vi.fn() },
  stockMovement: { findMany: vi.fn() },
}));

vi.mock("../../lib/db", () => ({ db: mocks }));

describe("Stock movement history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes the selected stock and its movements to Organization, Site, store, and item", async () => {
    mocks.storeStock.findFirst.mockResolvedValue({
      id: "stock-1",
      storeId: "store-1",
      sparePartId: "part-1",
      store: { code: "MAIN", name: "Main store" },
      sparePart: {
        code: "SP-001",
        itemCode: "ITEM-001",
        name: "Bearing",
        unit: "EA",
      },
    });
    mocks.stockMovement.findMany.mockResolvedValue([]);
    const { loadStockMovementHistory } =
      await import("./stock-movement-history");

    await loadStockMovementHistory({
      organizationId: "org-1",
      plantId: "plant-1",
      stockId: "stock-1",
    });

    expect(mocks.storeStock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "stock-1",
          organizationId: "org-1",
          plantId: "plant-1",
        },
      }),
    );
    expect(mocks.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          plantId: "plant-1",
          storeId: "store-1",
          sparePartId: "part-1",
        },
        take: 100,
      }),
    );
  });

  it("does not query movements when the stock row is outside the selected scope", async () => {
    mocks.storeStock.findFirst.mockResolvedValue(null);
    const { loadStockMovementHistory } =
      await import("./stock-movement-history");

    await expect(
      loadStockMovementHistory({
        organizationId: "org-1",
        plantId: "plant-1",
        stockId: "foreign-stock",
      }),
    ).resolves.toBeNull();
    expect(mocks.stockMovement.findMany).not.toHaveBeenCalled();
  });
});
