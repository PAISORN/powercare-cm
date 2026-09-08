import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Assets registry pagination", () => {
  it("paginates Asset rows in groups of 50 and preserves filters", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("const PAGE_SIZE = 50");
    expect(source).toContain("skip: (currentPage - 1) * PAGE_SIZE");
    expect(source).toContain("take: PAGE_SIZE");
    expect(source).toContain('aria-label="Asset pagination"');
    expect(source).toContain("หน้าที่ {currentPage} จาก {totalPages}");
    expect(source).toContain("function pageUrl(query: Query, page: number)");
  });

  it("builds the new hierarchy from every Asset level while paginating matches", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('const hierarchy = query.view !== "list"');
    expect(source).toContain("buildAssetHierarchy(treeAssets");
    expect(source).toContain("รอตรวจสอบโครงสร้าง");
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
