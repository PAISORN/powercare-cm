import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { SparePartClassificationFields } from "../../../components/store/spare-part-classification-fields";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockListQuery } from "../../../modules/store/stock-list-query";
import type { StockPageData } from "../../../modules/store/stock-page-data";

export function StockFilterPanel({
  activeFilterCount,
  categories,
  materialGroups,
  scopedHref,
  scope,
  search,
  searchSuggestions,
  sparePartTypes,
  stockQuery,
  stockStatus,
  stores,
  units,
}: {
  activeFilterCount: number;
  categories: StockPageData["categories"];
  materialGroups: StockPageData["materialGroups"];
  scopedHref: string;
  scope: AdminSiteScope;
  search: string;
  searchSuggestions: StockPageData["searchSuggestions"];
  sparePartTypes: StockPageData["sparePartTypes"];
  stockQuery: StockListQuery;
  stockStatus: StockListQuery["stockStatus"];
  stores: StockPageData["stores"];
  units: StockPageData["units"];
}) {
  return (
    <>
        <section aria-label="ตัวกรอง Stock" className="relative z-20">
          <details className="group" data-testid="stock-filter-bar">
            <summary
              aria-label="ตัวกรอง"
              className="ml-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
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
            <form action="/dashboardstore/stock" className="mt-4 w-full pt-4">
              <AdminScopeHiddenFields scope={scope} />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
                <label className={labelClass}>
                  ค้นหา
                  <span className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                      size={17}
                    />
                    <input
                      autoComplete="off"
                      className={`${inputClass} pl-10`}
                      defaultValue={search}
                      list="stock-search-suggestions"
                      name="search"
                      placeholder="ค้นหา รหัสอะไหล่, รายการอะไหล่, Part No."
                    />
                    <datalist id="stock-search-suggestions">
                      {searchSuggestions.map((item) => (
                        <option key={item.id} value={item.code}>
                          {item.itemCode ? `${item.itemCode} · ` : ""}
                          {item.name}
                        </option>
                      ))}
                    </datalist>
                  </span>
                </label>
                <label className={labelClass}>
                  คลังอะไหล่
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={stockQuery.storeId}
                    name="storeId"
                  >
                    <option value="">ทั้งหมด</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </label>
                <label className={labelClass}>
                  ชนิดรายการ
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={stockQuery.itemKind ?? ""}
                    name="itemKind"
                  >
                    <option value="">ทั้งหมด</option>
                    <option value="SPARE_PART">อะไหล่</option>
                    <option value="CHEMICAL">สารเคมี</option>
                    <option value="OIL">น้ำมัน</option>
                  </AutoSubmitSelect>
                </label>
                <label className={labelClass}>
                  ประเภท
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={stockQuery.typeId}
                    name="typeId"
                  >
                    <option value="">ทั้งหมด</option>
                    {sparePartTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto] xl:items-end">
                <SparePartClassificationFields
                  categories={categories}
                  className={inputClass}
                  defaultCategoryId={stockQuery.categoryId}
                  defaultMaterialGroupId={stockQuery.materialGroupId}
                  filter
                  groups={materialGroups}
                />
                <label className={labelClass}>
                  หน่วยนับ
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={stockQuery.unit}
                    name="unit"
                  >
                    <option value="">ทั้งหมด</option>
                    {units.map((item) => (
                      <option key={item.unit} value={item.unit}>
                        {item.unit}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </label>
                <label className={labelClass}>
                  สถานะสต็อก
                  <AutoSubmitSelect
                    className={inputClass}
                    defaultValue={stockStatus}
                    name="stockStatus"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="available">เพียงพอ</option>
                    <option value="nearMin">ใกล้หมด</option>
                    <option value="outOfStock">หมดสต็อก</option>
                  </AutoSubmitSelect>
                </label>
                <button className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
                  ใช้ตัวกรอง
                </button>
                <Link className={clearButtonClass} href={scopedHref}>
                  ล้างตัวกรอง
                </Link>
              </div>
            </form>
          </details>
        </section>


    </>
  );
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
const clearButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--soft)]";
