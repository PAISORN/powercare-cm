import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Spare parts page", () => {
  it("supports inventory fields used by the stock table", () => {
    expect(existsSync("app/dashboardstore/spare-parts/page.tsx")).toBe(true);
    const pageSource = readFileSync(
      "app/dashboardstore/spare-parts/page.tsx",
      "utf8",
    );
    const source = readSparePartsFeatureSource();

    expect(source).toContain('name="itemCode"');
    expect(source).toContain('name="description"');
    expect(source).toContain('name="unit"');
    expect(source).toContain('name="minStock"');
    expect(source).toContain('name="maxStock"');
    expect(source).toContain('name="reorderPoint"');
    expect(source).toContain('name="defaultStoreId"');
    expect(source).toContain('name="typeId"');
    expect(source).not.toContain('name="storageZoneId"');
    expect(source).toContain('name="zoneIds"');
    expect(source).toContain("name={`zoneCode:${zone.id}`}");
    expect(source).toContain("saveStoreApplicableZones");
    expect(source).toContain("db.storeApplicableZone.findMany");
    expect(source).toContain("ใช้เฉพาะตอนเบิกอะไหล่");
    expect(source).not.toContain("zoneAssignments:");
    expect(source).toContain("Spare Parts Master Data");
    expect(source).toContain("Home &gt; Inventory &gt; Spare Parts");
    expect(source).toContain("stock-page-hero stock-page-heading");
    expect(source).toContain("dashboard-kpi-carousel stock-summary-grid");
    expect(source).toContain("dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide");
    expect(source).toContain('data-testid="spare-parts-filter-bar"');
    expect(source).toContain('data-testid="spare-parts-master-data-panel"');
    expect(source).toContain('aria-label="จัดการ Master Data"');
    expect(source).toContain('aria-label="ตัวกรอง"');
    expect(source).toContain("group-open:rotate-180");
    expect(pageSource.indexOf("<SparePartsSummary")).toBeLessThan(
      pageSource.indexOf("<SparePartsMasterData"),
    );
    expect(pageSource.indexOf("<SparePartsMasterData")).toBeLessThan(
      pageSource.indexOf('data-testid="spare-parts-filter-bar"'),
    );
    expect(
      pageSource.indexOf('data-testid="spare-parts-filter-bar"'),
    ).toBeLessThan(pageSource.indexOf('id="spare-parts-table-region"'));
    expect(source).not.toContain("<ScopeInfo");
    expect(source).not.toContain('href="#spare-parts-master-data"');
    expect(source).toContain("ข้อมูลพื้นฐานและรหัสอ้างอิง");
    expect(source).toContain("หมวดอะไหล่");
    expect(source).toContain("เพิ่มอะไหล่");
    expect(source).not.toContain('shadow-[var(--shadow)]" open');
    expect(source).toContain("saveSparePartCategory");
    expect(source).toContain("saveSparePartType");
    expect(source).not.toContain("saveStorageZone");
    expect(source).toContain("saveStore");
    expect(source).toContain("addStore");
    expect(source).toContain("deleteStore");
    expect(source).toMatch(/<MasterRowActions\s+canEdit=\{canManageStore\}/);
    expect(source).toContain("maxStock: optionalNumber");
    expect(source).toContain("editPartId");
    expect(source).toContain("updateInventoryItemFromFormData");
    expect(source).toContain("disabled={!canViewStockValue}");
    expect(source).toContain("<table");
    expect(source).toContain("<aside");
    expect(source).toContain("MoreVertical");
    expect(source).toContain(
      'StockHeaderReplacementController regionId="spare-parts-table-region"',
    );
    expect(source).toContain("data-stock-replacement-header");
    expect(source).toContain("data-stock-table-scroll");
    expect(source).toContain("data-stock-table-header");
    expect(source).toContain("SparePartsTableColGroup");
    expect(source).toContain("SparePartsTableHeaderRow");
    expect(source).toContain("sticky top-0 z-40 bg-[var(--soft)]");
    expect(source).toContain("ops-panel stock-table-panel rounded-3xl");
    expect(source).toContain("const SPARE_PARTS_PAGE_SIZE = 50");
    expect(source).toContain("visibleSpareParts.map");
    expect(source).toContain("SparePartsPagination");
    expect(source).toContain('params.set("partsPage", String(page))');
  });

  it("handles invalid material group codes without crashing the route", () => {
    const source = readSparePartsFeatureSource();

    expect(source).toContain("materialGroupActionError(error)");
    expect(source).toContain("pageErrorUrl(scope");
    expect(source).toContain('role="alert"');
    expect(source).toContain('pattern="[A-Za-z0-9][A-Za-z0-9._/-]*"');
  });
  it("opens master data and add-spare-part forms in organized modal dialogs", () => {
    const source = readSparePartsFeatureSource();
    const modal = readFileSync(
      "components/store/spare-parts-master-modal.tsx",
      "utf8",
    );

    expect(source).toContain("import { SparePartsMasterModal }");
    expect(source.match(/<MasterPanel\b/g)).toHaveLength(5);
    expect(source).toContain('title="Applicable Zones"');
    expect(source).toContain('title="เพิ่มอะไหล่"');
    expect(source).toContain("data-spare-parts-modal-close");
    expect(source).toContain("xl:grid-cols-3");
    expect(modal).toContain('role="dialog"');
    expect(modal).toContain('aria-modal="true"');
    expect(modal).toContain("backdrop-blur-md");
    expect(modal).toContain('event.key === "Escape"');
  });
});

function readSparePartsFeatureSource() {
  return [
    "app/dashboardstore/spare-parts/page.tsx",
    "app/dashboardstore/spare-parts/actions.ts",
    "app/dashboardstore/spare-parts/spare-parts-master-data.tsx",
    "app/dashboardstore/spare-parts/spare-parts-summary.tsx",
    "modules/store/spare-parts-page-data.ts",
    "modules/store/spare-parts-page-model.ts",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
}
