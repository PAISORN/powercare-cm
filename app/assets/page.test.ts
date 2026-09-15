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

  it("renders the List and Tree views as a two-state expanding capsule toggle", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('aria-label="เลือกรูปแบบการแสดง Assets"');
    expect(source).toContain('role="group"');
    expect(source).toContain('active ? "w-36 bg-white text-[#4c437e] shadow-sm" : "w-12 text-white hover:bg-white/10"');
    expect(source).toContain('className={active ? "whitespace-nowrap" : "sr-only"}');
    expect(source).toContain('aria-current={active ? "page" : undefined}');
  });
  it("keeps the current scroll position when filters or the List/Tree view change", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("<PreserveListPositionForm");
    expect(source).toContain('storageKey="assets" targetId="asset-filters"');
    expect(source).toContain('id="asset-view-toggle"');
    expect(source).toContain("scroll={false}");
  });

  it("keeps List View as a list while matching the Tree View data-column headings", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('role="columnheader">Assets</span><span role="columnheader">CODE ASSET</span><span role="columnheader">ASSET LEVEL</span><span role="columnheader">AREA / ZONE</span><span role="columnheader">สถานะ PM / CM</span><span role="columnheader">ASSET TYPE</span>');
    expect(source).toContain("const listGrid =");
    expect(source).toContain("<ListMaintenanceStatus");
    expect(source).toContain("asset.assetType?.nameTh || asset.assetType?.nameEn");
  });

  it("builds the new hierarchy from every Asset level and all filtered matches", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('const hierarchy = query.view !== "list"');
    expect(source).toContain("buildAssetHierarchy(treeAssets");
    expect(source).toContain("<AssetTreeWorkspace");
    expect(source).toContain("const treeSystems = systems.map");
  });

  it("creates Tree Assets through a permission-checked Server Action and passes R8 drawer options", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("async function createTreeAsset");
    expect(source).toContain("if (!canManageAssets(user))");
    expect(source).toContain('allowedLevels = ["MAIN_ASSET", "SUB_ASSET", "PART"]');
    expect(source).toContain('parent.assetLevel === "MAIN_ASSET" ? ["SUB_ASSET", "PART"]');
    expect(source).toContain('parent.assetLevel === "SUB_ASSET" ? ["PART"]');
    expect(source).toContain("createAction={createTreeAsset}");
    expect(source).toContain("createOptions={{ organizationId: scope.organization.id");
  });

  it("updates Tree Assets through the same validation service from the right-side edit drawer", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("async function editTreeAsset");
    expect(source).toContain("updateRegisteredAsset(asset.id");
    expect(source).toContain("canRecodeAssets(user)");
    expect(source).toContain('source: "TREE_DRAWER"');
    expect(source).toContain("editAction={editTreeAsset}");
  });

  it("protects Tree Asset deletion with permission, current-user password, child checks, soft-delete, and audit", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("async function deleteTreeAsset");
    expect(source).toContain("if (!canManageAssets(user))");
    expect(source).toContain("verifyPassword(password, currentUser.passwordHash)");
    expect(source).toContain("activeChildren");
    expect(source).toContain('registrationStatus: "CANCELED"');
    expect(source).toContain('action: "DELETE_ASSET"');
    expect(source).toContain("deleteAction={deleteTreeAsset}");
  });

  it("loads the latest CM and PM status for each Tree Asset", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('cmWorks: { orderBy: { createdAt: "desc" }, take: 1');
    expect(source).toContain('pmWorks: { orderBy: { updatedAt: "desc" }, take: 1');
    expect(source).toContain("cmStatus: asset.cmWorks[0]?.status || null");
    expect(source).toContain("pmStatus: asset.pmWorks[0]?.status || null");
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
