import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");
const routeSource = read("app/assets/page.tsx");
const actionSource = read("app/assets/actions.ts");
const componentSource = read("components/asset-registry-page.tsx");
const tableSource = read("components/asset-list-table.tsx");
const querySource = read("modules/assets/asset-list-query.ts");
const dataSource = read("modules/assets/asset-list-page-data.ts");
const modelSource = read("modules/assets/asset-list-page-model.ts");
const source = [
  routeSource,
  actionSource,
  componentSource,
  tableSource,
  querySource,
  dataSource,
  modelSource,
].join("\n");

describe("Assets registry architecture", () => {
  it("keeps the route focused on authorization and orchestration", () => {
    expect(routeSource).toContain("loadAssetListPageData");
    expect(routeSource).toContain("buildAssetListPageModel");
    expect(routeSource).toContain("<AssetRegistryPage");
    expect(routeSource).not.toContain("db.asset");
    expect(routeSource).not.toContain('"use server"');
  });

  it("shows every filtered Asset without pagination", () => {
    expect(dataSource).toContain("db.asset.findMany({ where");
    expect(querySource).toContain("export function assetsUrl");
    expect(source).not.toContain("const PAGE_SIZE");
    expect(source).not.toContain("skip:");
    expect(source).not.toContain('aria-label="Asset pagination"');
  });

  it("renders List and Tree as the existing expanding capsule toggle", () => {
    expect(componentSource).toContain('aria-label="เลือกรูปแบบการแสดง Assets"');
    expect(componentSource).toContain('role="group"');
    expect(componentSource).toContain(
      'active ? "w-36 bg-white text-[#4c437e] shadow-sm"',
    );
    expect(componentSource).toContain("scroll={false}");
  });

  it("uses the shared responsive jewel treatment for Asset KPI cards", () => {
    expect(componentSource).toContain("dashboard-kpi-carousel");
    expect(componentSource).toContain("dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide");
    expect(componentSource).toContain('aria-label="Asset KPI strip"');
  });

  it("preserves scroll position for filters, rows, and view changes", () => {
    expect(componentSource).toContain("<PreserveListPositionForm");
    expect(componentSource).toContain('storageKey="assets"');
    expect(componentSource).toContain('targetId="asset-filters"');
    expect(componentSource).toContain('id="asset-view-toggle"');
    expect(tableSource).toContain("returnTo=${encodeURIComponent");
  });

  it("keeps List View columns and latest CM/PM state", () => {
    for (const heading of [
      "CODE ASSET",
      "ASSET LEVEL",
      "AREA / ZONE",
      "สถานะ PM / CM",
      "ASSET TYPE",
    ]) {
      expect(tableSource).toContain(heading);
    }
    expect(tableSource).toContain("<ListMaintenanceStatus");
    expect(dataSource).toContain('orderBy: { createdAt: "desc" as const }');
    expect(dataSource).toContain('orderBy: { updatedAt: "desc" as const }');
  });

  it("builds hierarchy context from every Asset level and filtered matches", () => {
    expect(querySource).toContain('query.view !== "list"');
    expect(modelSource).toContain("buildAssetHierarchy");
    expect(componentSource).toContain("<AssetTreeWorkspace");
    expect(modelSource).toContain("const treeSystems");
    expect(modelSource).toContain("contextOnly: branch.contextOnly");
  });

  it("keeps Tree create and edit actions behind Asset permissions", () => {
    expect(actionSource).toContain("export async function createTreeAsset");
    expect(actionSource).toContain("export async function editTreeAsset");
    expect(actionSource.match(/if \(!canManageAssets\(user\)\)/g)?.length).toBe(
      3,
    );
    expect(actionSource).toContain(
      'allowedLevels = ["MAIN_ASSET", "SUB_ASSET", "PART"]',
    );
    expect(actionSource).toMatch(/updateRegisteredAsset\(\s*asset\.id,/);
    expect(actionSource).toContain('auditSource: "TREE_DRAWER"');
  });

  it("protects Tree deletion with password, child checks, soft-delete, and audit", () => {
    expect(actionSource).toContain("export async function deleteTreeAsset");
    expect(actionSource).toContain(
      "verifyPassword(password, currentUser.passwordHash)",
    );
    expect(actionSource).toContain("activeChildren");
    expect(actionSource).toContain('registrationStatus: "CANCELED"');
    expect(actionSource).toContain('action: "DELETE_ASSET"');
  });

  it("keeps all filters in the URL and submits dropdowns immediately", () => {
    expect(componentSource.match(/<AutoSubmitSelect/g)?.length).toBe(10);
    for (const field of [
      "systemId",
      "assetTypeId",
      "assetLevel",
      "discipline",
      "sort",
      "assetClassId",
      "familyId",
      "zoneId",
      "status",
      "criticality",
    ]) {
      expect(componentSource).toContain(`name="${field}"`);
    }
    expect(querySource).toContain("assetClassId: query.assetClassId");
    expect(querySource).toContain("familyId: query.familyId");
  });

  it("shows uploaded Asset images in registry rows", () => {
    expect(tableSource).toContain("asset.imageStoragePath");
    expect(tableSource).toContain("`/asset-images/${asset.id}`");
    expect(tableSource).toContain('loading="lazy"');
    expect(tableSource).toContain('className="h-full w-full object-cover"');
  });
});
