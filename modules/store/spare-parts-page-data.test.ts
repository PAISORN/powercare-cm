import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  plant: { findUniqueOrThrow: vi.fn() },
  store: { findMany: vi.fn() },
  sparePartCategory: { findMany: vi.fn() },
  sparePartMaterialGroup: { findMany: vi.fn() },
  sparePartType: { findMany: vi.fn() },
  zone: { findMany: vi.fn() },
  storeApplicableZone: { findMany: vi.fn() },
  sparePart: { findMany: vi.fn() },
}));

vi.mock("../../lib/db", () => ({ db: mocks }));

describe("Spare Parts page data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plant.findUniqueOrThrow.mockResolvedValue({ inventoryCode: "RTB" });
    mocks.store.findMany.mockResolvedValue([]);
    mocks.sparePartCategory.findMany.mockResolvedValue([]);
    mocks.sparePartMaterialGroup.findMany.mockResolvedValue([]);
    mocks.sparePartType.findMany.mockResolvedValue([]);
    mocks.zone.findMany.mockResolvedValue([]);
    mocks.storeApplicableZone.findMany.mockResolvedValue([]);
    mocks.sparePart.findMany.mockResolvedValue([]);
  });

  it("loads every master-data section from the selected Site", async () => {
    const { loadSparePartsPageData } = await import("./spare-parts-page-data");

    await loadSparePartsPageData("site-1");

    expect(mocks.plant.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "site-1" } }),
    );
    for (const query of [
      mocks.store.findMany,
      mocks.sparePartCategory.findMany,
      mocks.sparePartMaterialGroup.findMany,
      mocks.sparePartType.findMany,
      mocks.storeApplicableZone.findMany,
      mocks.sparePart.findMany,
    ]) {
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ where: { plantId: "site-1" } }),
      );
    }
    expect(mocks.zone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { plantId: "site-1", active: true },
      }),
    );
  });
});
