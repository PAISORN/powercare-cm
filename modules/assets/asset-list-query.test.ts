import { describe, expect, it } from "vitest";
import {
  assetListOrderBy,
  assetListWhere,
  assetsUrl,
  assetViewUrl,
  isAssetHierarchyView,
} from "./asset-list-query";

describe("asset list query", () => {
  it("builds every selected filter and the multi-field search", () => {
    expect(
      assetListWhere("site-1", {
        search: "pump",
        systemId: "sys-1",
        assetTypeId: "type-1",
        assetLevel: "MAIN_ASSET",
        discipline: "Mechanical",
        assetClassId: "class-1",
        familyId: "family-1",
        zoneId: "zone-1",
        status: "IN_SERVICE",
        criticality: "HIGH",
      }),
    ).toMatchObject({
      plantId: "site-1",
      registrationStatus: "ACTIVE",
      systemId: "sys-1",
      assetTypeId: "type-1",
      assetLevel: "MAIN_ASSET",
      discipline: "Mechanical",
      assetClassId: "class-1",
      familyId: "family-1",
      zoneId: "zone-1",
      operatingStatus: "IN_SERVICE",
      criticality: "HIGH",
      OR: expect.arrayContaining([
        { code: { contains: "pump" } },
        { serialNumber: { contains: "pump" } },
        { model: { contains: "pump" } },
      ]),
    });
  });

  it("preserves query state while switching views", () => {
    expect(
      assetViewUrl(
        { organizationId: "org-1", plantId: "site-1", search: "P-01" },
        "list",
      ),
    ).toBe("/assets?organizationId=org-1&plantId=site-1&search=P-01&view=list");
    expect(assetsUrl({ plantId: "site-1", search: "" })).toBe(
      "/assets?plantId=site-1",
    );
    expect(isAssetHierarchyView({})).toBe(true);
    expect(isAssetHierarchyView({ view: "list" })).toBe(false);
  });

  it("keeps the established sort choices", () => {
    expect(assetListOrderBy({ sort: "name" })).toEqual([
      { nameTh: "asc" },
      { code: "asc" },
    ]);
    expect(assetListOrderBy({ sort: "codeDesc" })).toEqual([{ code: "desc" }]);
  });
});
