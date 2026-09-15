import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Assets registry tree view", () => {
  it("shows every filtered Asset without pagination", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("db.asset.findMany({ where,");
    expect(source).toContain("function assetsUrl(query: Query)");
    expect(source).not.toContain("const PAGE_SIZE");
    expect(source).not.toContain("skip:");
    expect(source).not.toContain('aria-label="Asset pagination"');
  });

  it("builds the new hierarchy from every Asset level and all filtered matches", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('const hierarchy = query.view !== "list"');
    expect(source).toContain("buildAssetHierarchy(treeAssets");
    expect(source).toContain("<AssetTreeWorkspace");
    expect(source).toContain("const treeSystems = systems.map");
  });

  it("filters Assets by Asset Class while preserving the selection in the URL", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("assetClassId?: string");
    expect(source).toContain('name="assetClassId"');
    expect(source).toContain('aria-label="Asset Class"');
    expect(source).toContain('query.assetClassId ? { assetClassId: query.assetClassId } : {}');
    expect(source).toContain("ทุก Asset Class");
  });

  it("filters Assets by Asset Families while preserving the selection in the URL", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("familyId?: string");
    expect(source).toContain('name="familyId"');
    expect(source).toContain('aria-label="Asset Families"');
    expect(source).toContain('query.familyId ? { familyId: query.familyId } : {}');
    expect(source).toContain("ทุก Asset Families");
  });

  it("applies every dropdown filter immediately after selection", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('import { AutoSubmitSelect } from "../../components/auto-submit-select"');
    expect(source.match(/<AutoSubmitSelect/g)?.length).toBe(10);
    expect(source).toContain('<AutoSubmitSelect aria-label="System"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Asset Type"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Asset Level"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Discipline"');
    expect(source).toContain('<AutoSubmitSelect aria-label="เรียงลำดับ"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Asset Class"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Asset Families"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Zone"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Asset status"');
    expect(source).toContain('<AutoSubmitSelect aria-label="Criticality"');
  });

  it("shows the uploaded Asset image as a thumbnail in each registry row", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("asset.imageStoragePath?");
    expect(source).toContain("`/asset-images/${asset.id}`");
    expect(source).toContain('loading="lazy"');
    expect(source).toContain('className="h-full w-full object-cover"');
  });
});
