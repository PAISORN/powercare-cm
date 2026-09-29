import {
  AlertTriangle,
  Boxes,
  Download,
  FileSpreadsheet,
  FileText,
  PackagePlus,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RestoreListPosition } from "../../../components/preserve-list-position";
import { requireUser } from "../../../lib/session";
import {
  canUseUserPermission,
  PermissionKey,
} from "../../../modules/auth/site-admin-permissions";
import {
  buildStockExportHref,
  buildStockListHref,
  buildStockListPositionKey,
  countStockListFilters,
  parseStockListQuery,
} from "../../../modules/store/stock-list-query";
import { loadStockPageData } from "../../../modules/store/stock-page-data";
import { buildStockPageModel } from "../../../modules/store/stock-page-model";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { StockDrawers } from "./stock-drawers";
import { StockFilterPanel } from "./stock-filter-panel";
import { StockInventoryTable } from "./stock-inventory-table";
import type { StockPageQuery } from "./types";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<StockPageQuery>;
}) {
  const user = await requireUser();
  if (
    !canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) &&
    !canUseUserPermission(user, PermissionKey.ADJUST_STOCK)
  )
    redirect("/dashboardcm");

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const stockQuery = parseStockListQuery(query);
  const stockListScope = {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  };
  const canAdjust = canUseUserPermission(user, PermissionKey.ADJUST_STOCK);
  const canManageParts = canUseUserPermission(
    user,
    PermissionKey.MANAGE_SPARE_PARTS,
  );
  const canReceive = canUseUserPermission(user, PermissionKey.RECEIVE_STOCK);
  const canIssue = canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE);
  const canEditValue = canUseUserPermission(
    user,
    PermissionKey.VIEW_STOCK_VALUE,
  );
  const search = stockQuery.search;
  const stockStatus = stockQuery.stockStatus;

  const {
    stores,
    categories,
    materialGroups,
    sparePartTypes,
    issueZones,
    units,
    stocks,
    searchSuggestions,
  } = await loadStockPageData(scope.plant.id, stockQuery);

  const stockModel = buildStockPageModel(stocks, stockQuery.page);
  const {
    currentPage,
    groupedStocks,
    pageEnd,
    pageStart,
    pagedStocks,
    stockRowNumbers,
    summary,
    totalPages,
  } = stockModel;
  const scopedHref = `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;
  const canonicalStockQuery = { ...stockQuery, page: currentPage };
  const stockPageHref = (page: number) =>
    buildStockListHref(stockListScope, canonicalStockQuery, page);
  const stockExportHref = (format: "pdf" | "xlsx") =>
    buildStockExportHref(stockListScope, canonicalStockQuery, format);
  const sparePartEditHref = (sparePartId: string) =>
    `${stockPageHref(currentPage)}&editPartId=${encodeURIComponent(sparePartId)}#edit-spare-part`;
  const editPart = query.editPartId
    ? (stocks.find((stock) => stock.sparePart.id === query.editPartId)
        ?.sparePart ?? null)
    : null;
  const selectedStock = query.stockId
    ? stocks.find((stock) => stock.id === query.stockId)
    : null;
  const requestedStockAction = selectedStock ? query.stockAction : undefined;
  const stockAction =
    requestedStockAction === "adjust" && !canAdjust
      ? undefined
      : requestedStockAction;
  const stockListPositionKey = buildStockListPositionKey(
    stockListScope,
    canonicalStockQuery,
  );
  const activeFilterCount = countStockListFilters(canonicalStockQuery);

  return (
    <>
      <div className="space-y-5">
        <RestoreListPosition
          enabled={!editPart && !stockAction}
          storageKey={stockListPositionKey}
        />
        <header className="menu-heading-plain stock-page-hero stock-page-heading relative overflow-hidden rounded-3xl border p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="relative z-10 grid items-end gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/70">
                Home &gt; Inventory &gt; Stock
              </p>
              <div className="mt-4 flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur sm:h-[72px] sm:w-[72px]"
                >
                  <Warehouse size={42} strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Stock (คลังอะไหล่)
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-white/75">
                    ตรวจสอบยอดคงเหลือ มูลค่าคลัง จุดขั้นต่ำ
                    และประวัติการเคลื่อนไหวของอะไหล่ใน Site
                  </p>
                </div>
              </div>
            </div>
            <div className="grid justify-items-end gap-3">
              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]"
                  href="/dashboardstore/receive"
                >
                  <PackagePlus size={17} />
                  เพิ่มอะไหล่เข้าสต็อก
                </Link>
                {canManageParts ? (
                  <Link
                    className={`${secondaryButtonClass} stock-hero-secondary`}
                    href={`${stockPageHref(currentPage)}&importExcel=1#excel-import-drawer`}
                  >
                    <Download size={17} />
                    นำเข้า Excel
                  </Link>
                ) : null}
                <Link
                  className={`${secondaryButtonClass} stock-hero-secondary`}
                  href={stockExportHref("pdf")}
                  target="_blank"
                >
                  <FileText size={17} />
                  PDF ตาม Filter
                </Link>
                <Link
                  className={`${secondaryButtonClass} stock-hero-secondary`}
                  href={stockExportHref("xlsx")}
                >
                  <FileSpreadsheet size={17} />
                  Excel ตาม Filter
                </Link>
              </div>
            </div>
          </div>
        </header>

        {query.saved === "1" ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            ปรับยอดสต็อกและบันทึกประวัติเรียบร้อยแล้ว
          </p>
        ) : null}
        {query.error ? (
          <p
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300"
            role="alert"
          >
            ปรับยอดไม่สำเร็จ: {query.error}
          </p>
        ) : null}
        {query.imported ? (
          <p
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300"
            role="status"
          >
            นำเข้าอะไหล่จาก Excel สำเร็จ {query.imported} รายการ
            พร้อมสร้างยอดตั้งต้นแล้ว
          </p>
        ) : null}

        <section className="dashboard-kpi-carousel stock-summary-grid md:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            color="blue"
            icon={<Boxes size={28} />}
            label="มูลค่าอะไหล่คงเหลือรวม"
            sublabel={canEditValue ? "บาท" : "ไม่มีสิทธิ์ดูมูลค่า"}
            value={canEditValue ? formatMoney(summary.totalValue) : "-"}
          />
          <SummaryCard
            color="green"
            icon={<Warehouse size={28} />}
            label="จำนวนรายการอะไหล่"
            sublabel="รายการ"
            value={formatQuantity(summary.itemCount)}
          />
          <SummaryCard
            color="violet"
            icon={<SlidersHorizontal size={28} />}
            label="จำนวนทั้งหมด"
            sublabel="หน่วยนับ"
            value={formatQuantity(summary.totalQuantity)}
          />
          <SummaryCard
            color="orange"
            icon={<AlertTriangle size={28} />}
            label="ใกล้หมด (ต่ำกว่า Min)"
            sublabel="รายการ"
            value={formatQuantity(summary.nearMinCount)}
          />
          <SummaryCard
            color="red"
            icon={<AlertTriangle size={28} />}
            label="หมดสต็อก"
            sublabel="รายการ"
            value={formatQuantity(summary.outOfStockCount)}
          />
        </section>

        <StockFilterPanel
          activeFilterCount={activeFilterCount}
          categories={categories}
          materialGroups={materialGroups}
          scopedHref={scopedHref}
          scope={scope}
          search={search}
          searchSuggestions={searchSuggestions}
          sparePartTypes={sparePartTypes}
          stockQuery={stockQuery}
          stockStatus={stockStatus}
          stores={stores}
          units={units}
        />

        <StockInventoryTable
          canAdjust={canAdjust}
          canIssue={canIssue}
          canManageParts={canManageParts}
          canReceive={canReceive}
          canViewValue={canEditValue}
          currentPage={currentPage}
          pageEnd={pageEnd}
          pageStart={pageStart}
          pagedStocks={pagedStocks}
          scope={scope}
          sparePartEditHref={sparePartEditHref}
          stockListPositionKey={stockListPositionKey}
          stockPageHref={stockPageHref}
          stockQuery={stockQuery}
          stockRowNumbers={stockRowNumbers}
          totalItems={groupedStocks.length}
          totalPages={totalPages}
        />

        <StockDrawers
          canEditValue={canEditValue}
          canManageParts={canManageParts}
          categories={categories}
          currentPage={currentPage}
          editPart={editPart}
          issueZones={issueZones}
          materialGroups={materialGroups}
          query={query}
          scope={scope}
          selectedStock={selectedStock}
          sparePartTypes={sparePartTypes}
          stockAction={stockAction}
          stockPageHref={stockPageHref}
          stores={stores}
          user={user}
        />
      </div>
    </>
  );
}
function SummaryCard({
  color,
  icon,
  label,
  sublabel,
  value,
}: {
  color: "blue" | "green" | "violet" | "orange" | "red";
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: string;
}) {
  const colors = {
    blue: "#3b82f6",
    green: "#10b981",
    violet: "#8b5cf6",
    orange: "#f59e0b",
    red: "#ef4444",
  }[color];

  return (
    <article
      className="dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide relative min-h-[148px] overflow-hidden rounded-2xl border p-4 transition duration-300 sm:p-5"
      style={{ "--kpi-color": colors } as React.CSSProperties}
    >
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-extrabold leading-5">{label}</p>
          <span className="dashboard-kpi-icon shrink-0">{icon}</span>
        </div>
        <p className="mt-3 whitespace-nowrap text-2xl font-black tracking-tight">
          {value}
        </p>
        <p className="mt-2 text-xs font-bold text-[var(--muted)]">
          {sublabel}
        </p>
      </div>
    </article>
  );
}
function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--soft)]";
