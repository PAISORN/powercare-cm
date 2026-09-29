import {
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { StockHeaderReplacementController } from "../../../components/stock-header-replacement-controller";
import { SparePartClassificationFields } from "../../../components/store/spare-part-classification-fields";
import { paginationWindow } from "../../../lib/pagination-window";
import { requireUser } from "../../../lib/session";
import {
  canUseUserPermission,
  PermissionKey,
} from "../../../modules/auth/site-admin-permissions";
import { updateSparePartAction } from "./actions";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { loadSparePartsPageData } from "../../../modules/store/spare-parts-page-data";
import {
  buildSparePartsPageModel,
  type SparePartsListQuery,
} from "../../../modules/store/spare-parts-page-model";
import { SparePartsSummary } from "./spare-parts-summary";
import { SparePartsMasterData } from "./spare-parts-master-data";

type PageQuery = SparePartsListQuery & {
  organizationId?: string;
  plantId?: string;
  saved?: string;
  error?: string;
};

export default async function SparePartsPage({
  searchParams,
}: {
  searchParams: Promise<PageQuery>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const canManageParts = canUseUserPermission(
    user,
    PermissionKey.MANAGE_SPARE_PARTS,
  );
  const canManageStore = canUseUserPermission(user, PermissionKey.MANAGE_STORE);
  const canViewStockValue = canUseUserPermission(
    user,
    PermissionKey.VIEW_STOCK_VALUE,
  );
  const canAdjustStock = canUseUserPermission(user, PermissionKey.ADJUST_STOCK);
  const canReceiveStock = canUseUserPermission(
    user,
    PermissionKey.RECEIVE_STOCK,
  );
  const canView =
    canManageParts ||
    canManageStore ||
    canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) ||
    canUseUserPermission(user, PermissionKey.RECEIVE_STOCK);
  if (!canView) redirect("/dashboardcm");

  const pageData = await loadSparePartsPageData(scope.plant.id);
  const {
    materialGroups,
    partCategories,
    partTypes,
    plantConfig,
    spareParts,
    stores,
  } = pageData;
  const pageModel = buildSparePartsPageModel(pageData, query);
  const {
    activeFilterCount,
    activeMaterialGroups,
    activePartCategories,
    activePartCount,
    activePartTypes,
    activeStores,
    currentSparePartsPage,
    editPart,
    filteredSpareParts,
    firstVisibleSparePartIndex,
    lowStockPartCount,
    search,
    totalPartValue,
    totalSparePartsPages,
    units,
    visibleSpareParts,
  } = pageModel;
  const scopedBaseUrl = sparePartsPageHref(
    scope,
    currentSparePartsPage,
    false,
    query,
  );
  const scopedStockUrl = `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;
  return (
    <>
      <div className="space-y-5">
        <header className="menu-heading-plain stock-page-hero stock-page-heading relative overflow-hidden rounded-3xl border p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="relative z-10 grid items-end gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/70">
                Home &gt; Inventory &gt; Spare Parts
              </p>
              <div className="mt-4 flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 !text-white backdrop-blur sm:h-[72px] sm:w-[72px]"
                >
                  <Boxes size={42} strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Spare Parts (ข้อมูลอะไหล่)
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-white/75">
                    จัดการข้อมูลอะไหล่ หมวดหมู่ คลัง และระดับ Stock ของ{" "}
                    {scope.plant.name}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid justify-items-end gap-3">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold !text-white">
                Site: {scope.plant.name} · Code{" "}
                {plantConfig.inventoryCode ?? "ยังไม่ตั้งค่า"}
              </span>
              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  className={`${secondaryButtonClass} stock-hero-secondary !text-white`}
                  href={scopedStockUrl}
                >
                  <Warehouse size={17} />
                  เปิดหน้า Stock
                </Link>
              </div>
            </div>
          </div>
        </header>

        {query.saved ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            บันทึกข้อมูลเรียบร้อยแล้ว
          </p>
        ) : null}
        {query.error ? (
          <p
            aria-live="polite"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300"
            role="alert"
          >
            {query.error}
          </p>
        ) : null}

        <SparePartsSummary
          activePartCount={activePartCount}
          canViewStockValue={canViewStockValue}
          categoryCount={partCategories.length}
          lowStockPartCount={lowStockPartCount}
          partCount={spareParts.length}
          totalPartValue={totalPartValue}
        />
        <section
          aria-label="เครื่องมือ Spare Parts"
          className="relative z-20 pt-12"
        >
          <SparePartsMasterData
            canManageParts={canManageParts}
            canManageStore={canManageStore}
            canViewStockValue={canViewStockValue}
            data={pageData}
            model={pageModel}
            scope={scope}
          />
          <details className="group" data-testid="spare-parts-filter-bar">
            <summary
              aria-label="ตัวกรอง"
              className="absolute right-0 top-0 flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
            >
              <SlidersHorizontal aria-hidden="true" size={17} />
              ตัวกรอง
              {activeFilterCount ? (
                <span className="grid size-6 place-items-center rounded-full bg-white/20 text-[11px]">
                  {activeFilterCount}
                </span>
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className="transition-transform duration-200 group-open:rotate-180"
                size={16}
              />
            </summary>
            <form
              action="/dashboardstore/spare-parts#spare-parts-table-region"
              className="mt-4 w-full pt-4"
              method="get"
            >
              <AdminScopeHiddenFields scope={scope} />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(2,minmax(0,1fr))]">
                <label className={labelClass}>
                  ค้นหา
                  <span className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                      size={17}
                    />
                    <input
                      className={`${inputClass} pl-10`}
                      defaultValue={query.search ?? ""}
                      name="search"
                      placeholder="รหัส, Item code, ชื่อ หรือรายละเอียดอะไหล่"
                    />
                  </span>
                </label>
                <label className={labelClass}>
                  คลังอะไหล่
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={query.storeId ?? ""}
                    name="storeId"
                  >
                    <option value="">ทั้งหมด</option>
                    {activeStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.code} · {store.name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </label>
                <label className={labelClass}>
                  ประเภท
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={query.typeId ?? ""}
                    name="typeId"
                  >
                    <option value="">ทั้งหมด</option>
                    {activePartTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.code} · {type.name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto] xl:items-end">
                <SparePartClassificationFields
                  categories={activePartCategories}
                  className={inputClass}
                  defaultCategoryId={query.categoryId ?? ""}
                  defaultMaterialGroupId={query.materialGroupId ?? ""}
                  filter
                  groups={activeMaterialGroups}
                />
                <label className={labelClass}>
                  หน่วยนับ
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={query.unit ?? ""}
                    name="unit"
                  >
                    <option value="">ทั้งหมด</option>
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </label>
                <button className={primaryButtonClass}>ใช้ตัวกรอง</button>
                <Link
                  className={secondaryButtonClass}
                  href={sparePartsPageHref(scope, 1, true)}
                >
                  ล้างตัวกรอง
                </Link>
              </div>
            </form>
          </details>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">รายการอะไหล่</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {scope.plant.name}
            </p>
          </div>
          <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold">
            {filteredSpareParts.length} รายการ
          </span>
        </div>

        <StockHeaderReplacementController regionId="spare-parts-table-region" />
        <section
          className="ops-panel stock-table-panel rounded-3xl border border-[var(--line)]"
          id="spare-parts-table-region"
        >
          <div
            aria-hidden="true"
            className="stock-replacement-header"
            data-stock-replacement-header
          >
            <table className="w-full min-w-[1370px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <SparePartsTableColGroup />
              <thead className="bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)]">
                <SparePartsTableHeaderRow />
              </thead>
            </table>
          </div>

          <div
            className="relative overflow-x-auto rounded-t-3xl bg-[var(--surface)]"
            data-stock-table-scroll
          >
            <table className="w-full min-w-[1370px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <SparePartsTableColGroup />
              <thead
                className="sticky top-0 z-40 bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)] shadow-[0_1px_0_var(--line)]"
                data-stock-table-header
              >
                <SparePartsTableHeaderRow />
              </thead>
              <tbody>
                {visibleSpareParts.map((part) => {
                  const totalStock = part.stocks.reduce(
                    (sum, stock) => sum + Number(stock.quantity),
                    0,
                  );
                  const lowStock = totalStock <= Number(part.minStock);
                  return (
                    <tr
                      key={part.id}
                      className="transition hover:bg-[var(--soft)]/60 [&>td]:border-b [&>td]:border-[var(--line)] last:[&>td]:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{part.name}</p>
                          <p className="mt-1 font-mono text-xs font-extrabold text-[var(--primary)]">
                            {part.code}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold">
                        {part.itemCode ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-bold">{part.type?.name ?? "-"}</p>
                        <p className="text-[var(--muted)]">
                          {part.type?.code ?? "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-bold">
                          {part.category?.name ?? "-"}
                        </p>
                        <p className="text-[var(--muted)]">
                          {part.category?.code ?? "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-bold">
                          {part.defaultStore?.name ?? "-"}
                        </p>
                        <p className="text-[var(--muted)]">
                          {part.defaultStore?.code ?? "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{part.unit}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        <p>
                          Max{" "}
                          {part.maxStock == null
                            ? "-"
                            : formatQuantity(Number(part.maxStock))}
                        </p>
                        <p>ROP {formatQuantity(Number(part.reorderPoint))}</p>
                        <p className="text-[var(--muted)]">
                          Min {formatQuantity(Number(part.minStock))}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canViewStockValue
                          ? formatMoney(part.latestUnitPrice)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-extrabold ${lowStock ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {formatQuantity(totalStock)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManageParts ? (
                          <Link
                            aria-label={`แก้ไข ${part.name}`}
                            className="inline-flex size-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                            href={`${scopedBaseUrl}&editPartId=${encodeURIComponent(part.id)}#edit-spare-part`}
                          >
                            <MoreVertical size={18} />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!spareParts.length ? (
              <div className="p-8 text-center text-sm text-[var(--muted)]">
                ยังไม่มีอะไหล่ใน Site นี้
              </div>
            ) : null}
          </div>
          {spareParts.length ? (
            <SparePartsPagination
              currentPage={currentSparePartsPage}
              firstItem={firstVisibleSparePartIndex + 1}
              lastItem={firstVisibleSparePartIndex + visibleSpareParts.length}
              scope={scope}
              totalItems={filteredSpareParts.length}
              totalPages={totalSparePartsPages}
              query={query}
            />
          ) : null}
        </section>

        {editPart && canManageParts ? (
          <aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6"
            id="edit-spare-part"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">
                  Edit Spare Part
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {editPart.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {editPart.code}
                </p>
              </div>
              <Link
                className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold"
                href={scopedBaseUrl}
              >
                ปิด
              </Link>
            </div>
            <form action={updateSparePartAction} className="mt-5 grid gap-4">
              <AdminScopeHiddenFields scope={scope} />
              <input name="sparePartId" type="hidden" value={editPart.id} />
              <label className={labelClass}>
                ชนิดรายการ
                <select
                  aria-disabled={user.role !== "ADMIN"}
                  className={`${inputClass} ${user.role === "ADMIN" ? "" : "pointer-events-none bg-[var(--soft)] text-[var(--muted)]"}`}
                  defaultValue={editPart.itemKind}
                  name="itemKind"
                  required
                  tabIndex={user.role === "ADMIN" ? 0 : -1}
                >
                  <option value="SPARE_PART">อะไหล่</option>
                  <option value="CHEMICAL">สารเคมี</option>
                  <option value="OIL">น้ำมัน</option>
                </select>
              </label>
              <label className={labelClass}>
                ชื่ออะไหล่
                <input
                  className={inputClass}
                  defaultValue={editPart.name}
                  name="name"
                  required
                />
              </label>
              <label className={labelClass}>
                Item code
                <input
                  className={inputClass}
                  defaultValue={editPart.itemCode ?? ""}
                  maxLength={20}
                  name="itemCode"
                  required
                />
              </label>
              <label className={labelClass}>
                คลังอะไหล่
                <select
                  className={inputClass}
                  defaultValue={editPart.defaultStoreId ?? ""}
                  name="defaultStoreId"
                  required
                >
                  <option value="" disabled>
                    เลือกคลังอะไหล่
                  </option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.code} · {store.name}
                      {store.active ? "" : " (ไม่ใช้งาน)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                ประเภทอะไหล่ / ค่าใช้จ่าย
                <select
                  className={inputClass}
                  defaultValue={editPart.typeId ?? ""}
                  name="typeId"
                  required
                >
                  <option value="" disabled>
                    เลือกประเภท
                  </option>
                  {partTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.code} · {type.name}
                      {type.active ? "" : " (ไม่ใช้งาน)"}
                    </option>
                  ))}
                </select>
              </label>
              <SparePartClassificationFields
                categories={partCategories}
                className={inputClass}
                defaultCategoryId={editPart.categoryId ?? ""}
                defaultMaterialGroupId={editPart.materialGroupId ?? ""}
                groups={materialGroups}
              />
              <label className={labelClass}>
                หน่วยนับ
                <input
                  className={inputClass}
                  defaultValue={editPart.unit}
                  name="unit"
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Min
                  <input
                    className={inputClass}
                    defaultValue={Number(editPart.minStock)}
                    min="0"
                    name="minStock"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className={labelClass}>
                  Max
                  <input
                    className={inputClass}
                    defaultValue={
                      editPart.maxStock == null ? "" : Number(editPart.maxStock)
                    }
                    min="0"
                    name="maxStock"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className={labelClass}>
                  จุดสั่งซื้อ
                  <input
                    className={inputClass}
                    defaultValue={Number(editPart.reorderPoint)}
                    min="0"
                    name="reorderPoint"
                    step="0.01"
                    type="number"
                    required
                  />
                </label>
                <label className={labelClass}>
                  ราคาล่าสุด
                  <input
                    className={`${inputClass} ${canViewStockValue ? "" : "cursor-not-allowed bg-[var(--soft)] text-[var(--muted)]"}`}
                    defaultValue={
                      canViewStockValue && editPart.latestUnitPrice != null
                        ? Number(editPart.latestUnitPrice)
                        : ""
                    }
                    disabled={!canViewStockValue}
                    min="0"
                    name="latestUnitPrice"
                    step="0.01"
                    type="number"
                  />
                </label>
              </div>
              <label className={labelClass}>
                รายละเอียด
                <textarea
                  className={`${inputClass} min-h-24 py-3`}
                  defaultValue={editPart.description ?? ""}
                  name="description"
                />
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--soft)] px-4 text-sm font-bold">
                <input
                  className="size-4 accent-[var(--primary)]"
                  defaultChecked={editPart.active}
                  name="active"
                  type="checkbox"
                />
                เปิดใช้งาน
              </label>
              <button className={primaryButtonClass}>บันทึกการแก้ไข</button>
            </form>

            <section className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">ยอดคงเหลือตามคลัง</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    ปรับจำนวนผ่าน Stock Movement เพื่อเก็บประวัติการเปลี่ยนแปลง
                  </p>
                </div>
                {!editPart.stocks.length && canReceiveStock ? (
                  <Link
                    className={secondaryButtonClass}
                    href={`/dashboardstore/receive?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`}
                  >
                    รับอะไหล่เข้าครั้งแรก
                  </Link>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2">
                {editPart.stocks.map((stock) => (
                  <div
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3"
                    key={`${stock.storeId}:${stock.sparePartId}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">
                        {stock.store.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        คงเหลือ {formatQuantity(Number(stock.quantity))}{" "}
                        {editPart.unit}
                      </p>
                    </div>
                    {canReceiveStock ? (
                      <Link
                        className={secondaryButtonClass}
                        href={`${scopedStockUrl}&stockId=${encodeURIComponent(stock.id)}&stockAction=receive#stock-action-drawer`}
                      >
                        รับเข้า
                      </Link>
                    ) : null}
                    {canAdjustStock ? (
                      <Link
                        className={primaryButtonClass}
                        href={`${scopedStockUrl}&stockId=${encodeURIComponent(stock.id)}&stockAction=adjust#stock-action-drawer`}
                      >
                        ปรับยอด
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </>
  );
}

function SparePartsTableColGroup() {
  return (
    <colgroup>
      <col className="w-[210px]" />
      <col className="w-[110px]" />
      <col className="w-[150px]" />
      <col className="w-[120px]" />
      <col className="w-[180px]" />
      <col className="w-[80px]" />
      <col className="w-[100px]" />
      <col className="w-[110px]" />
      <col className="w-[100px]" />
      <col className="w-[60px]" />
    </colgroup>
  );
}

function SparePartsTableHeaderRow() {
  return (
    <tr>
      <th className="px-4 py-3">รหัส / ชื่ออะไหล่</th>
      <th className="px-4 py-3">Item code</th>
      <th className="px-4 py-3">ประเภท</th>
      <th className="px-4 py-3">หมวดหมู่</th>
      <th className="px-4 py-3">คลังอะไหล่</th>
      <th className="px-4 py-3">หน่วย</th>
      <th className="px-4 py-3 text-right">Max / ROP / Min</th>
      <th className="px-4 py-3 text-right">ราคาล่าสุด</th>
      <th className="px-4 py-3 text-right">คงเหลือ</th>
      <th className="px-4 py-3" />
    </tr>
  );
}

function SparePartsPagination({
  currentPage,
  firstItem,
  lastItem,
  scope,
  totalItems,
  totalPages,
  query,
}: {
  currentPage: number;
  firstItem: number;
  lastItem: number;
  scope: { organization: { id: string }; plant: { id: string } };
  totalItems: number;
  totalPages: number;
  query: PageQuery;
}) {
  const pageItems = paginationItems(currentPage, totalPages);

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4 sm:px-6">
      <p className="text-sm font-semibold text-[var(--muted)]">
        แสดง {firstItem}-{lastItem} จาก {totalItems} รายการ · หน้า {currentPage}
        /{totalPages}
      </p>
      {totalPages > 1 ? (
        <nav
          aria-label="Spare parts pagination"
          className="flex flex-wrap items-center justify-end gap-2"
        >
          <SparePartsPageLink
            disabled={currentPage === 1}
            href={sparePartsPageHref(
              scope,
              Math.max(1, currentPage - 1),
              true,
              query,
            )}
            label="ก่อนหน้า"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </SparePartsPageLink>
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                className="grid min-h-10 min-w-10 place-items-center text-sm font-bold text-[var(--muted)]"
                key={`ellipsis-${index}`}
              >
                …
              </span>
            ) : (
              <SparePartsPageLink
                active={item === currentPage}
                href={sparePartsPageHref(scope, item, true, query)}
                key={item}
                label={`หน้า ${item}`}
              >
                {item}
              </SparePartsPageLink>
            ),
          )}
          <SparePartsPageLink
            disabled={currentPage === totalPages}
            href={sparePartsPageHref(
              scope,
              Math.min(totalPages, currentPage + 1),
              true,
              query,
            )}
            label="ถัดไป"
          >
            <span>ถัดไป</span>
            <ChevronRight size={16} />
          </SparePartsPageLink>
        </nav>
      ) : null}
    </footer>
  );
}

function SparePartsPageLink({
  active = false,
  children,
  disabled = false,
  href,
  label,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  href: string;
  label: string;
}) {
  const className = active
    ? "inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full bg-[var(--primary)] px-3 text-sm font-extrabold text-white shadow-sm"
    : disabled
      ? "pointer-events-none inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-[var(--line)] px-3 text-sm font-bold text-[var(--muted)] opacity-45"
      : "inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold transition hover:border-[var(--primary)] hover:bg-[var(--soft)] hover:text-[var(--primary)]";

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={className}
      href={href}
      scroll
    >
      {children}
    </Link>
  );
}

function sparePartsPageHref(
  scope: { organization: { id: string }; plant: { id: string } },
  page: number,
  includeTableAnchor = true,
  query?: Pick<
    PageQuery,
    "search" | "storeId" | "typeId" | "categoryId" | "materialGroupId" | "unit"
  >,
) {
  const params = new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  });
  if (query?.search) params.set("search", query.search);
  if (query?.storeId) params.set("storeId", query.storeId);
  if (query?.typeId) params.set("typeId", query.typeId);
  if (query?.categoryId) params.set("categoryId", query.categoryId);
  if (query?.materialGroupId)
    params.set("materialGroupId", query.materialGroupId);
  if (query?.unit) params.set("unit", query.unit);
  if (page > 1) params.set("partsPage", String(page));
  const url = `/dashboardstore/spare-parts?${params.toString()}`;
  return includeTableAnchor ? `${url}#spare-parts-table-region` : url;
}

function paginationItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  return paginationWindow(currentPage, totalPages);
}

function formatMoney(value: { toString(): string } | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(Number(value));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

const inputClass =
  "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold text-[var(--ink)]";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]";
const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-5 font-bold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]";
