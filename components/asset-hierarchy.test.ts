import { describe, expect, it } from "vitest";
import { buildAssetHierarchy } from "./asset-hierarchy";

const assets = [
  { id: "main", parentId: null, systemId: "system", assetLevel: "MAIN_ASSET", migrationStatus: "READY" },
  { id: "sub", parentId: "main", systemId: "system", assetLevel: "SUB_ASSET", migrationStatus: "READY" },
  { id: "part", parentId: "sub", systemId: "system", assetLevel: "PART", migrationStatus: "READY" },
  { id: "review", parentId: null, systemId: null, assetLevel: "PART", migrationStatus: "NEED_PARENT_REVIEW" },
];

describe("Asset tree filtering", () => {
  it("keeps ancestors as context when a Part matches search", () => {
    const tree = buildAssetHierarchy(assets, new Set(["part"]), new Set(["system"]));
    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0].asset.id).toBe("main");
    expect(tree.roots[0].contextOnly).toBe(true);
    expect(tree.roots[0].children[0].asset.id).toBe("sub");
    expect(tree.roots[0].children[0].contextOnly).toBe(true);
    expect(tree.roots[0].children[0].children[0]).toMatchObject({ asset: { id: "part" }, contextOnly: false });
  });

  it("shows unresolved matches in the review section instead of inventing a root", () => {
    const tree = buildAssetHierarchy(assets, new Set(["review"]), new Set(["system"]));
    expect(tree.roots).toEqual([]);
    expect(tree.review.map(item => item.id)).toEqual(["review"]);
  });
  it.each(["SUB_ASSET", "PART"])("keeps a %s Asset that belongs directly to a System as a root", assetLevel => {
    const directAsset = { id: `direct-${assetLevel}`, parentId: null, systemId: "system", assetLevel, migrationStatus: "READY" };
    const tree = buildAssetHierarchy([directAsset], new Set([directAsset.id]), new Set(["system"]));
    expect(tree.roots).toEqual([{ asset: directAsset, contextOnly: false, children: [] }]);
    expect(tree.review).toEqual([]);
  });

});
