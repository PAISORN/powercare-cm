import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assetFamilyFindMany: vi.fn(),
  assetClassFindMany: vi.fn(),
  assetTypeFindMany: vi.fn(),
  zoneFindMany: vi.fn(),
  assetSystemFindMany: vi.fn(),
  assetFindMany: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  db: {
    assetFamily: { findMany: mocks.assetFamilyFindMany },
    assetClass: { findMany: mocks.assetClassFindMany },
    assetType: { findMany: mocks.assetTypeFindMany },
    zone: { findMany: mocks.zoneFindMany },
    assetSystem: { findMany: mocks.assetSystemFindMany },
    asset: { findMany: mocks.assetFindMany },
  },
}));

import { loadAssetRegistrationOptions } from "./asset-registration-page-data";

describe("Asset registration page data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(mocks)) mock.mockResolvedValue([]);
  });

  it("scopes every form option query to the selected Site", async () => {
    await loadAssetRegistrationOptions("plant-a");

    for (const mock of [
      mocks.assetFamilyFindMany,
      mocks.assetClassFindMany,
      mocks.assetTypeFindMany,
      mocks.zoneFindMany,
      mocks.assetSystemFindMany,
    ]) {
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ plantId: "plant-a", active: true }),
        }),
      );
    }
    expect(mocks.assetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          plantId: "plant-a",
          registrationStatus: "ACTIVE",
        },
      }),
    );
  });
});
