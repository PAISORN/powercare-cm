import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store stock page", () => {
  it("filters edit material groups by the selected spare-part category", () => {
    const source = readFileSync("app/dashboardstore/stock/page.tsx", "utf8");
    const editRegion = source.slice(source.indexOf('id="edit-spare-part"'), source.indexOf("{selectedStock && stockAction"));

    expect(editRegion).toContain("<SparePartClassificationFields");
    expect(editRegion).toContain("defaultCategoryId={editPart.categoryId");
    expect(editRegion).toContain("defaultMaterialGroupId={editPart.materialGroupId");
    expect(editRegion).not.toContain("materialGroups.map");
  });

  it("uses distinct soft color surfaces for important stock summary cards", () => {
    const source = readFileSync("app/dashboardstore/stock/page.tsx", "utf8");

    expect(source).toContain("surfaceClass");
    expect(source).toContain("stock-summary-card");
    expect(source).toContain("stock-summary-blue");
    expect(source).toContain("stock-summary-green");
    expect(source).toContain("stock-summary-orange");
    expect(source).toContain("stock-summary-red");
  });

  it("preserves filters, pagination, and the edited row position after saving", () => {
    const source = readFileSync("app/dashboardstore/stock/page.tsx", "utf8");

    expect(source).toContain('name="returnTo"');
    expect(source).toContain("stockPageHref(currentPage)");
    expect(source).toContain("stockListPositionKey");
    expect(source).toContain("PreserveListPositionLink");
    expect(source).toContain("RestoreListPosition");
    expect(source).toContain("stock-row-${stock.sparePart.id}");
    expect(source).toContain("saved=spare-part-updated${returnHash");
    expect(source).toContain("enabled={!editPart && !stockAction}");
    expect(source).toContain("${stockPageHref(currentPage)}&stockAction=issue");
    expect(source).toContain("${stockPageHref(currentPage)}&stockAction=receive");
    expect(source).toContain('href={`${stockPageHref(currentPage)}#stock-row-${selectedStock.sparePart.id}`} scroll={false}');
    expect(source).not.toContain("${scopedHref}&stockAction=issue");
    expect(source).not.toContain("${scopedHref}&stockAction=receive");
  });

  it("keeps right sidebars below whichever stock header is fixed", () => {
    const source = readFileSync("app/dashboardstore/stock/page.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");
    const controller = readFileSync("components/stock-header-replacement-controller.tsx", "utf8");

    expect(source.match(/stock-right-sidebar/g)).toHaveLength(3);
    expect(source).not.toContain("fixed inset-y-0 right-0 z-50 w-full");
    expect(styles).toContain("top: var(--stock-app-topbar-offset, 5.25rem)");
    expect(styles).toContain('html[data-stock-header-replacement="active"] .stock-right-sidebar');
    expect(styles).toContain("top: var(--stock-replacement-header-height, 4rem)");
    expect(controller).toContain('setProperty("--stock-replacement-header-height"');
    expect(controller).toContain('removeProperty("--stock-replacement-header-height"');
  });
  it("renders an enterprise stock dashboard with filters, inventory table, and row actions", () => {
    expect(existsSync("app/dashboardstore/stock/page.tsx")).toBe(true);
    const source = readFileSync("app/dashboardstore/stock/page.tsx", "utf8");

    expect(source).toContain("Home &gt; Inventory &gt; Stock");
    expect(source).toContain("typeId");
    expect(source).toContain("categoryId");
    expect(source).toContain('name="unit"');
    expect(source).toContain("Item code");
    expect(source).toContain("Max");
    expect(source).toContain("categoryRunningNumbers");
    expect(source).toContain("stockPageSize = 50");
    expect(source).toContain("pagedStocks.map");
    expect(source).toContain("stockPageHref");
    expect(source).toContain("Stock pagination");
    expect(source).toContain('aria-label="ไปยังหน้าที่ต้องการ"');
    expect(source).toContain('action="/dashboardstore/stock#stock-table-region"');
    expect(source).toContain('aria-label="เลขหน้า"');
    expect(source).toContain('max={totalPages}');
    expect(source).toContain('name="page"');
    expect(source).toContain('name="materialGroupId" type="hidden"');
    expect(source).toContain('py-4 pl-4 pr-1">คลังอะไหล่ / ตำแหน่ง');
    expect(source).toContain('py-4 pl-1 pr-3 text-right">คงเหลือ');
    expect(source).toContain("StockHeaderReplacementController");
    expect(source).toContain('id="stock-table-region"');
    expect(source).toContain("data-stock-table-header");
    expect(source).toContain("data-stock-replacement-header");
    expect(source).toContain("data-stock-table-scroll");
    expect(source).toContain("stock-replacement-header");
    expect(source).toContain("StockTableColGroup");
    expect(source).toContain("min-w-[1340px] table-fixed");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("sticky top-0 z-40 bg-[var(--soft)]");
    expect(source).toContain("ops-panel rounded-3xl border border-[var(--line)]");
    expect(source).toContain("bg-[var(--surface)] transition hover:bg-[var(--soft)]/80");
    expect(source).toContain("[&>td]:border-b [&>td]:border-[var(--line)] last:[&>td]:border-b-0");
    expect(source).toContain("bg-blue-500/10 text-blue-700 hover:bg-blue-600");
    expect(source).toContain("w-[4.75rem]");
    expect(source).not.toContain("max-h-[70vh] overflow-x-auto overflow-y-auto");
    expect(source).not.toContain("Barcode");
    expect(source).toContain("StockStatusPill");
    expect(source).toContain("ชื่อและรหัสอะไหล่");
    expect(source).toContain("มูลค่าอะไหล่");

    expect(source).toContain('stock.sparePart.materialGroup?.name ?? "-"');
    expect(source).toContain('<p className="font-bold">{stock.sparePart.category?.name ?? "-"}</p>');
    expect(source).toContain('<p className="mt-1 text-xs text-[var(--muted)]">{stock.sparePart.materialGroup?.name ?? "-"}</p>');
    expect(source).not.toContain("รายละเอียดอะไหล่</th>");
    expect(source).not.toContain('className="line-clamp-2">{stock.sparePart.description');
    expect(source).not.toContain('<th className="px-4 py-4">กลุ่มอะไหล่/วัสดุ</th>');
    expect(source).toContain("ExclusiveDetails");
    expect(source).not.toContain('<details className="group relative">');
    expect(source).toContain("deleteSparePartFromStockAction");
    expect(source).toContain("ConfirmSubmitButton");
    expect(source).toContain('stockAction === "issue"');
    expect(source).toContain('stockAction === "receive"');
    expect(source).toContain('stockAction === "adjust"');
    expect(source).toContain('name="zoneId"');
    expect(source).toContain("db.storeApplicableZone.findMany");
    expect(source).toContain("issueZones.map");
    expect(source).toContain("Zone ที่นำอะไหล่ไปใช้งาน");
    expect(source).toContain("Issue");
    expect(source).toContain("Receive");
    expect(source).toContain("Adjust");
    expect(source).toContain("importSparePartsExcelAction");
    expect(source).toContain("importSparePartsFromExcel");
    expect(source).toContain('name="excelFile"');
    expect(source).toContain("/templates/spare-parts-import-template.xlsx");
    expect(source).toContain("ReferenceCodeList");
    expect(source).toContain("นำเข้าอะไหล่จาก Excel สำเร็จ");
    expect(source).not.toContain("Stock Movement ล่าสุด");
    expect(source).not.toContain("db.stockMovement.findMany");
    expect(source).not.toContain("movements.map");
    expect(source).not.toContain("Ã Â¸");
  });
});
