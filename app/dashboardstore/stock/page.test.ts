import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readStockPageSource() {
  return readFileSync("app/dashboardstore/stock/page.tsx", "utf8");
}

function readStockUiSource() {
  return [
    readStockPageSource(),
    readFileSync("app/dashboardstore/stock/stock-filter-panel.tsx", "utf8"),
    readFileSync("app/dashboardstore/stock/stock-inventory-table.tsx", "utf8"),
    readFileSync("app/dashboardstore/stock/stock-table-rows.tsx", "utf8"),
    readFileSync("app/dashboardstore/stock/stock-pagination.tsx", "utf8"),
    readFileSync(
      "app/dashboardstore/stock/stock-list-state-fields.tsx",
      "utf8",
    ),
    readFileSync("app/dashboardstore/stock/stock-drawers.tsx", "utf8"),
    readFileSync("app/dashboardstore/stock/stock-edit-drawer.tsx", "utf8"),
    readFileSync("app/dashboardstore/stock/stock-action-drawer.tsx", "utf8"),
    readFileSync("app/dashboardstore/stock/stock-action-forms.tsx", "utf8"),
    readFileSync(
      "app/dashboardstore/stock/stock-action-hidden-fields.tsx",
      "utf8",
    ),
    readFileSync(
      "app/dashboardstore/stock/stock-excel-import-drawer.tsx",
      "utf8",
    ),
  ].join("\n");
}

describe("Store stock page", () => {
  it("keeps route orchestration separate from the three Stock UI sections", () => {
    const source = readStockPageSource();

    expect(source).toContain("<StockFilterPanel");
    expect(source).toContain("<StockInventoryTable");
    expect(source).toContain("<StockDrawers");
    expect(source).toContain("buildStockPageModel(stocks, stockQuery.page)");
    expect(source).not.toContain("categoryRunningNumbers");
    expect(source).not.toContain("stockPageSize = 50");
    expect(source).not.toContain("groupedVisibleStocks.slice");
    expect(source).not.toContain('id="stock-table-region"');
    expect(source).not.toContain('id="edit-spare-part"');
    expect(source).not.toContain('data-testid="stock-filter-bar"');
  });

  it("keeps table rows and pagination separate from the table shell", () => {
    const source = readFileSync(
      "app/dashboardstore/stock/stock-inventory-table.tsx",
      "utf8",
    );

    expect(source).toContain("<StockTableRows");
    expect(source).toContain("<StockPagination");
    expect(source).not.toContain("pagedStocks.map");
    expect(source).not.toContain("paginationWindow(");
    expect(source).not.toContain("deleteSparePartFromStockAction");
    expect(source).not.toContain("visibleStocks:");
    expect(source).not.toContain("groupedVisibleStocks:");
  });

  it("uses the shared list state fields for pagination forms", () => {
    const pagination = readFileSync(
      "app/dashboardstore/stock/stock-pagination.tsx",
      "utf8",
    );
    const fields = readFileSync(
      "app/dashboardstore/stock/stock-list-state-fields.tsx",
      "utf8",
    );

    expect(pagination).toContain("<StockListStateFields");
    expect(pagination).not.toContain('name="organizationId"');
    expect(pagination).not.toContain('name="stockStatus"');
    expect(fields).toContain("stockListStateEntries(scope, query)");
  });

  it("filters edit material groups by the selected spare-part category", () => {
    const source = readFileSync(
      "app/dashboardstore/stock/stock-edit-drawer.tsx",
      "utf8",
    );

    expect(source).toContain("<SparePartClassificationFields");
    expect(source).toContain("defaultCategoryId={editPart.categoryId");
    expect(source).toContain(
      "defaultMaterialGroupId={editPart.materialGroupId",
    );
    expect(source).not.toContain("materialGroups.map");
  });

  it("keeps each Stock drawer in a focused component", () => {
    const source = readFileSync(
      "app/dashboardstore/stock/stock-drawers.tsx",
      "utf8",
    );

    expect(source).toContain("<StockEditDrawer");
    expect(source).toContain("<StockActionDrawer");
    expect(source).toContain("<StockExcelImportDrawer");
    expect(source).not.toContain("<form");
    expect(source).not.toContain("stock-right-sidebar");
  });

  it("keeps Stock action forms and shared hidden fields separate", () => {
    const drawer = readFileSync(
      "app/dashboardstore/stock/stock-action-drawer.tsx",
      "utf8",
    );
    const forms = readFileSync(
      "app/dashboardstore/stock/stock-action-forms.tsx",
      "utf8",
    );
    const hiddenFields = readFileSync(
      "app/dashboardstore/stock/stock-action-hidden-fields.tsx",
      "utf8",
    );

    expect(drawer).toContain("<StockIssueForm");
    expect(drawer).toContain("<StockReceiveForm");
    expect(drawer).toContain("<StockAdjustForm");
    expect(drawer).not.toContain("<form");
    expect(forms.match(/<StockActionHiddenFields/g)).toHaveLength(3);
    expect(hiddenFields).toContain('name="returnTo"');
    expect(hiddenFields).toContain('name="stockKey"');
  });

  it("uses the shared jewel KPI cards for important stock summaries", () => {
    const source = readFileSync("app/dashboardstore/stock/page.tsx", "utf8");

    expect(source).toContain("dashboard-kpi-carousel stock-summary-grid");
    expect(source).toContain("dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide");
    expect(source).toContain('blue: "#3b82f6"');
    expect(source).toContain('green: "#10b981"');
    expect(source).toContain('orange: "#f59e0b"');
    expect(source).toContain('red: "#ef4444"');
  });

  it("preserves filters, pagination, and the edited row position after saving", () => {
    const source = readStockUiSource();
    const actions = readFileSync("app/dashboardstore/stock/actions.ts", "utf8");

    expect(source.match(/name="returnTo"/g)).toHaveLength(4);
    expect(source.match(/<StockActionHiddenFields/g)).toHaveLength(3);
    expect(source).toContain("stockPageHref(currentPage)");
    expect(source).toContain("stockListPositionKey");
    expect(source).toContain("PreserveListPositionLink");
    expect(source).toContain("RestoreListPosition");
    expect(source).toContain("stock-row-${stock.sparePart.id}");
    expect(actions).toContain('"spare-part-updated"');
    expect(actions).toContain("stockHrefWithFeedback(returnTo, key, value)");
    expect(actions.match(/stockReturnTo\(scope, formData/g)).toHaveLength(6);
    expect(source).toContain("enabled={!editPart && !stockAction}");
    expect(source).toContain("${stockPageHref(currentPage)}&stockAction=issue");
    expect(source).toContain(
      "${stockPageHref(currentPage)}&stockAction=receive",
    );
    expect(source).toContain(
      "${stockPageHref(currentPage)}&stockAction=adjust",
    );
    expect(source).toContain(
      "href={`${stockPageHref(currentPage)}#stock-row-${selectedStock.sparePart.id}`}",
    );
    expect(source).toContain("scroll={false}");
    expect(source).not.toContain("${scopedHref}&stockAction=issue");
    expect(source).not.toContain("${scopedHref}&stockAction=receive");
  });

  it("routes Inventory Item edits through the shared edit module", () => {
    const source = readFileSync(
      "app/dashboardstore/stock/stock-edit-drawer.tsx",
      "utf8",
    );
    const actions = readFileSync("app/dashboardstore/stock/actions.ts", "utf8");

    expect(source).toContain("updateSparePartFromStockAction");
    expect(actions).toContain("updateInventoryItemFromFormData");
    expect(actions).not.toContain("const existingPrice =");
  });

  it("keeps right sidebars below whichever stock header is fixed", () => {
    const source = readStockUiSource();
    const styles = readFileSync("app/globals.css", "utf8");
    const controller = readFileSync(
      "components/stock-header-replacement-controller.tsx",
      "utf8",
    );

    expect(source.match(/stock-right-sidebar/g)).toHaveLength(3);
    expect(source).not.toContain("fixed inset-y-0 right-0 z-50 w-full");
    expect(styles).toContain("top: var(--stock-app-topbar-offset, 5.25rem)");
    expect(styles).toContain(
      'html[data-stock-header-replacement="active"] .stock-right-sidebar',
    );
    expect(styles).toContain(
      "top: var(--stock-replacement-header-height, 4rem)",
    );
    expect(styles).toContain(
      'html[data-stock-header-replacement="active"] .stock-table-panel',
    );
    expect(styles).toContain("transform: none !important");
    expect(controller).toMatch(
      /setProperty\(\s*"--stock-replacement-header-height"/,
    );
    expect(controller).toContain(
      'removeProperty("--stock-replacement-header-height")',
    );
  });
  it("shows stock values and exports through the shared list query contract", () => {
    const source = readStockUiSource();
    const loader = readFileSync("modules/store/stock-page-data.ts", "utf8");

    expect(source).toContain(
      'const stockExportHref = (format: "pdf" | "xlsx")',
    );
    expect(source).toContain("parseStockListQuery(query)");
    expect(source).toContain("buildStockListHref(");
    expect(source).toContain("buildStockExportHref(");
    expect(source).toContain("buildStockListPositionKey(");
    expect(source).toContain("countStockListFilters(");
    expect(source).toContain("loadStockPageData(scope.plant.id, stockQuery)");
    expect(loader).toContain("findStockBalanceRows({");
    expect(loader).toContain("stockReadFiltersFromListQuery(stockQuery)");
    expect(source).not.toContain("db.storeStock.findMany");
    expect(source).toContain('href={stockExportHref("pdf")}');
    expect(source).toContain('href={stockExportHref("xlsx")}');
    expect(source).toContain("PDF ตาม Filter");
    expect(source).toContain("Excel ตาม Filter");
    expect(source).toContain(
      'canViewValue ? formatMoney(quantity * unitPrice) : "-"',
    );
    expect(source).toContain(
      'canEditValue ? formatMoney(summary.totalValue) : "-"',
    );
    expect(source).toContain("disabled={!canEditValue}");
  });

  it("preserves the active list state through the Excel import drawer", () => {
    const source = `${readStockPageSource()}\n${readFileSync(
      "app/dashboardstore/stock/stock-drawers.tsx",
      "utf8",
    )}\n${readFileSync("app/dashboardstore/stock/stock-excel-import-drawer.tsx", "utf8")}`;
    const actions = readFileSync("app/dashboardstore/stock/actions.ts", "utf8");

    expect(source).toContain(
      "`${stockPageHref(currentPage)}&importExcel=1#excel-import-drawer`",
    );
    expect(actions).toContain("stockReturnTo(scope, formData, false)");
    expect(source).toContain("value={stockPageHref(currentPage)}");
    expect(source).toContain("href={stockPageHref(currentPage)}");
  });
  it("renders an enterprise stock dashboard with filters, inventory table, and row actions", () => {
    expect(existsSync("app/dashboardstore/stock/page.tsx")).toBe(true);
    const source = readStockUiSource();
    const actions = readFileSync("app/dashboardstore/stock/actions.ts", "utf8");
    const loader = readFileSync("modules/store/stock-page-data.ts", "utf8");

    expect(source).toContain("Home &gt; Inventory &gt; Stock");
    expect(source).toContain("typeId");
    expect(source).toContain("categoryId");
    expect(source).toContain('name="unit"');
    expect(source).toContain("Item code");
    expect(source).toContain("Max");
    expect(source).toContain("buildStockPageModel");
    expect(source).toContain("pagedStocks.map");
    expect(source).toContain("stockPageHref");
    expect(source).toContain("Stock pagination");
    expect(source).toContain('aria-label="ไปยังหน้าที่ต้องการ"');
    expect(source).toContain(
      'action="/dashboardstore/stock#stock-table-region"',
    );
    expect(source).toContain('aria-label="เลขหน้า"');
    expect(source).toContain("max={totalPages}");
    expect(source).toContain('name="page"');
    expect(source).toContain("stockListStateEntries(scope, query)");
    expect(source).toContain('type="hidden"');
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
    expect(source).toContain('data-testid="stock-filter-bar"');
    expect(source).toContain('aria-label="ตัวกรอง"');
    expect(source.indexOf("dashboard-kpi-carousel stock-summary-grid")).toBeLessThan(
      source.indexOf('data-testid="stock-filter-bar"'),
    );
    expect(source.indexOf('data-testid="stock-filter-bar"')).toBeLessThan(
      source.indexOf('id="stock-table-region"'),
    );
    expect(source).not.toContain('title="Stock site scope"');
    expect(source).not.toContain(
      "ops-panel page-outer-shell rounded-3xl border border-[var(--line)]",
    );
    expect(source).toContain(
      "bg-[var(--surface)] transition hover:bg-[var(--soft)]/80",
    );
    expect(source).toContain(
      "[&>td]:border-b [&>td]:border-[var(--line)] last:[&>td]:border-b-0",
    );
    expect(source).toContain("bg-blue-500/10 text-blue-700 hover:bg-blue-600");
    expect(source).toContain("w-[4.75rem]");
    expect(source).not.toContain(
      "max-h-[70vh] overflow-x-auto overflow-y-auto",
    );
    expect(source).not.toContain("Barcode");
    expect(source).toContain("StockStatusPill");
    expect(source).toContain("ชื่อและรหัสอะไหล่");
    expect(source).toContain("มูลค่าอะไหล่");

    expect(source).toContain('stock.sparePart.materialGroup?.name ?? "-"');
    expect(source).toContain('<p className="font-bold">');
    expect(source).toContain('stock.sparePart.category?.name ?? "-"');
    expect(source).toContain(
      '<p className="mt-1 text-xs text-[var(--muted)]">',
    );
    expect(source).toContain('stock.sparePart.materialGroup?.name ?? "-"');
    expect(source).not.toContain("รายละเอียดอะไหล่</th>");
    expect(source).not.toContain(
      'className="line-clamp-2">{stock.sparePart.description',
    );
    expect(source).not.toContain(
      '<th className="px-4 py-4">กลุ่มอะไหล่/วัสดุ</th>',
    );
    expect(source).toContain("ExclusiveDetails");
    expect(source).not.toContain('<details className="group relative">');
    expect(source).toContain("deleteSparePartFromStockAction");
    expect(source).toContain("ConfirmSubmitButton");
    expect(source).toContain('stockAction === "issue"');
    expect(source).toContain('stockAction === "receive"');
    expect(source).toContain('stockAction === "adjust"');
    expect(source).toContain('name="zoneId"');
    expect(loader).toContain("db.storeApplicableZone.findMany");
    expect(source).toContain("issueZones.map");
    expect(source).toContain("Zone ที่นำอะไหล่ไปใช้งาน");
    expect(source).toContain("Issue");
    expect(source).toContain("Receive");
    expect(source).toContain("Adjust");
    expect(source).toContain("importSparePartsExcelAction");
    expect(actions).toContain("importSparePartsFromExcel");
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
