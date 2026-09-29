import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  asset: { count: vi.fn(), findMany: vi.fn() },
  assetClass: { findMany: vi.fn() },
  assetFamily: { findMany: vi.fn() },
  zone: { findMany: vi.fn() },
  assetSystem: { findMany: vi.fn() },
  assetType: { findMany: vi.fn() },
}));

vi.mock("../../lib/db", () => ({ db: dbMock }));

import { loadAssetListPageData } from "./asset-list-page-data";

describe("loadAssetListPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of Object.values(dbMock)) {
      for (const method of Object.values(model)) method.mockResolvedValue([]);
    }
    dbMock.asset.count.mockResolvedValue(0);
  });

  it("scopes every lookup and summary to the selected Site", async () => {
    await loadAssetListPageData("site-1", { view: "tree", search: "P-01" });

    expect(dbMock.asset.findMany).toHaveBeenCalledTimes(2);
    for (const [args] of dbMock.asset.findMany.mock.calls) {
      expect(args.where.plantId).toBe("site-1");
    }
    for (const model of [
      dbMock.assetClass,
      dbMock.assetFamily,
      dbMock.zone,
      dbMock.assetSystem,
      dbMock.assetType,
    ]) {
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ plantId: "site-1" }),
        }),
      );
    }
  });

  it("does not load the full hierarchy for List view", async () => {
    await loadAssetListPageData("site-1", { view: "list" });
    expect(dbMock.asset.findMany).toHaveBeenCalledTimes(1);
  });
});
