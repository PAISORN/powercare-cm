import { describe, expect, it } from "vitest";
import { resolveAssetR8Names } from "./asset-r8-display";

const main = { assetLevel: "MAIN_ASSET", nameTh: "เครื่องหลัก", nameEn: "Main" };
const sub = { assetLevel: "SUB_ASSET", nameTh: "เครื่องย่อย", nameEn: "Sub", parent: main };

describe("resolveAssetR8Names", () => {
  it("places each hierarchy level in its matching R8 column", () => {
    expect(resolveAssetR8Names(main)).toEqual({ mainAsset: "Main", subAsset: null, partAsset: null });
    expect(resolveAssetR8Names(sub)).toEqual({ mainAsset: "Main", subAsset: "Sub", partAsset: null });
    expect(resolveAssetR8Names({ assetLevel: "PART", nameTh: "ชิ้นส่วน", nameEn: "Part", parent: sub })).toEqual({ mainAsset: "Main", subAsset: "Sub", partAsset: "Part" });
  });

  it("supports Parts below a Main Asset or directly below a System", () => {
    expect(resolveAssetR8Names({ assetLevel: "PART", nameTh: "Part under Main", parent: main })).toEqual({ mainAsset: "Main", subAsset: null, partAsset: "Part under Main" });
    expect(resolveAssetR8Names({ assetLevel: "PART", nameTh: "System Part" })).toEqual({ mainAsset: null, subAsset: null, partAsset: "System Part" });
  });
});
