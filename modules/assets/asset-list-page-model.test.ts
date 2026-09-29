import { describe, expect, it } from "vitest";
import type { AssetListPageData } from "./asset-list-page-data";
import { buildAssetListPageModel } from "./asset-list-page-model";

describe("buildAssetListPageModel", () => {
  it("keeps matching descendants with their parent context and return URL", () => {
    const system = { id: "sys-1", code: "SYS", nameTh: "ระบบ", nameEn: null };
    const base = {
      plantId: "site-1",
      systemId: "sys-1",
      migrationStatus: "READY",
      imageStoragePath: null,
      assetTypeId: null,
      zoneId: null,
      discipline: null,
      criticality: "MEDIUM",
      manufacturer: null,
      model: null,
      serialNumber: null,
      operatingStatus: "IN_SERVICE",
      keySpecification: null,
      family: null,
      assetType: null,
      zone: null,
      system,
      cmWorks: [],
      pmWorks: [],
      tagKks: null,
    };
    const main = {
      ...base,
      id: "main-1",
      parentId: null,
      assetLevel: "MAIN_ASSET",
      code: "MA-001",
      nameTh: "เครื่องหลัก",
      nameEn: null,
    };
    const part = {
      ...base,
      id: "part-1",
      parentId: "main-1",
      assetLevel: "PART",
      code: "PA-001",
      nameTh: "ชิ้นส่วน",
      nameEn: null,
    };
    const data = {
      assets: [part],
      treeAssets: [main, part],
      systems: [system],
    } as unknown as AssetListPageData;

    const model = buildAssetListPageModel(
      data,
      { search: "PA-001", view: "tree" },
      { organizationId: "org-1", plantId: "site-1" },
    );

    expect(model.treeSystems[0].branches[0].contextOnly).toBe(true);
    expect(model.treeSystems[0].branches[0].children[0].code).toBe("PA-001");
    expect(model.listUrl).toContain("search=PA-001");
    expect(model.treeSystems[0].branches[0].children[0].detailHref).toContain(
      "returnTo=",
    );
  });
});
