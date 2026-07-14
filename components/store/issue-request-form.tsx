"use client";

import { Minus, PackageSearch, Plus, Send } from "lucide-react";
import { useMemo, useState } from "react";

type StockStatus = "ENOUGH" | "LOW" | "OUT";

type StockOption = {
  storeId: string;
  sparePartId: string;
  label: string;
  available: number;
  unit: string;
  storeCode?: string;
  storeName?: string;
  storeCategoryName?: string;
  sparePartCode?: string;
  sparePartName?: string;
  sparePartCategoryName?: string;
  itemCode?: string | null;
  zoneNames?: string[];
  stockStatus?: StockStatus;
};

type CmOption = {
  id: string;
  number: string;
  label: string;
};

type StockFilters = {
  search: string;
  store: string;
  type: string;
  category: string;
  unit: string;
  zone: string;
  stockStatus: string;
};

const initialFilters: StockFilters = {
  search: "",
  store: "ALL",
  type: "ALL",
  category: "ALL",
  unit: "ALL",
  zone: "ALL",
  stockStatus: "ALL",
};

export function IssueRequestForm({
  action,
  organizationId,
  plantId,
  stocks,
  cmWorks,
  publicRequester,
  inventoryCode,
  lockedCmWork,
}: {
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  stocks: StockOption[];
  cmWorks: CmOption[];
  publicRequester?: { contactRequired: boolean };
  inventoryCode?: string;
  lockedCmWork?: CmOption;
}) {
  const [issueType, setIssueType] = useState<"CM_REFERENCED" | "DIRECT">("CM_REFERENCED");
  const [lineIds, setLineIds] = useState([1]);
  const [filters, setFilters] = useState<StockFilters>(initialFilters);
  const selectedIssueType = lockedCmWork ? "CM_REFERENCED" : issueType;
  const filterOptions = useMemo(() => buildFilterOptions(stocks), [stocks]);
  const filteredStocks = useMemo(() => stocks.filter((stock) => matchesStockFilters(stock, filters)), [filters, stocks]);

  return (
    <form action={action} className="space-y-5">
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="plantId" type="hidden" value={plantId} />
      {inventoryCode ? <input name="inventoryCode" type="hidden" value={inventoryCode} /> : null}
      {lockedCmWork ? (
        <>
          <input name="issueType" type="hidden" value="CM_REFERENCED" />
          <input name="cmWorkNumber" type="hidden" value={lockedCmWork.number} />
        </>
      ) : null}

      {publicRequester ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            ชื่อผู้ขอเบิก
            <input className={inputClass} name="requesterName" required />
          </label>
          <label className={labelClass}>
            เบอร์ติดต่อ / ช่องทางติดต่อ {publicRequester.contactRequired ? "" : "(ไม่บังคับ)"}
            <input className={inputClass} name="requesterContact" required={publicRequester.contactRequired} />
          </label>
        </div>
      ) : null}

      {lockedCmWork ? (
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-3 text-sm">
          <p className="font-extrabold text-[var(--primary)]">Store Request สำหรับงานนี้</p>
          <p className="mt-1 text-[var(--muted)]">
            {lockedCmWork.number} · {lockedCmWork.label}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="grid gap-2">
            <legend className={labelClass}>ประเภทการเบิก</legend>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--soft)] p-1.5">
              {[
                ["CM_REFERENCED", "อ้างอิงงาน CM"],
                ["DIRECT", "เบิกโดยตรง"],
              ].map(([value, label]) => (
                <label
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-center text-sm font-bold transition ${
                    issueType === value ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)]"
                  }`}
                  key={value}
                >
                  <input
                    checked={issueType === value}
                    className="sr-only"
                    name="issueType"
                    onChange={() => setIssueType(value as typeof issueType)}
                    type="radio"
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {selectedIssueType === "CM_REFERENCED" ? (
            <label className={labelClass}>
              เลขที่ CM ภายใน Site
              <select className={inputClass} defaultValue="" name="cmWorkNumber" required>
                <option disabled value="">
                  ค้นหาและเลือกเลขที่ CM
                </option>
                {cmWorks.map((work) => (
                  <option key={work.id} value={work.number}>
                    {work.number} · {work.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={labelClass}>
              เหตุผลการเบิกโดยตรง
              <input className={inputClass} name="note" required />
            </label>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold">รายการอะไหล่</h3>
            <p className="text-sm text-[var(--muted)]">เลือกอะไหล่ได้หลายรายการ ระบบจะตรวจยอดคงเหลือก่อนส่งคำขอ</p>
          </div>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            onClick={() => setLineIds((current) => [...current, Math.max(...current) + 1])}
            type="button"
          >
            <Plus size={17} />
            เพิ่มรายการ
          </button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3 md:grid-cols-4 xl:grid-cols-7">
          <label className={labelClass}>
            ค้นหา
            <input
              aria-label="Search spare parts"
              className={inputClass}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="รหัส, item code, ชื่ออะไหล่"
              value={filters.search}
            />
          </label>
          <FilterSelect label="คลังอะไหล่" options={filterOptions.stores} value={filters.store} onChange={(value) => setFilters((current) => ({ ...current, store: value }))} />
          <FilterSelect label="ประเภท" options={filterOptions.types} value={filters.type} onChange={(value) => setFilters((current) => ({ ...current, type: value }))} />
          <FilterSelect label="หมวดหมู่" options={filterOptions.categories} value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} />
          <FilterSelect label="หน่วยนับ" options={filterOptions.units} value={filters.unit} onChange={(value) => setFilters((current) => ({ ...current, unit: value }))} />
          <FilterSelect label="Zone" options={filterOptions.zones} value={filters.zone} onChange={(value) => setFilters((current) => ({ ...current, zone: value }))} />
          <FilterSelect label="สถานะสต๊อก" options={filterOptions.stockStatuses} value={filters.stockStatus} onChange={(value) => setFilters((current) => ({ ...current, stockStatus: value }))} />
        </div>

        {lineIds.map((lineId, index) => (
          <div
            className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 md:grid-cols-[minmax(240px,1fr)_130px_auto] md:items-end"
            key={lineId}
          >
            <label className={labelClass}>
              Store / อะไหล่
              <select className={inputClass} defaultValue="" name="stockKey" required>
                <option disabled value="">
                  เลือกอะไหล่จาก Stock
                </option>
                {filteredStocks.map((stock) => (
                  <option key={`${stock.storeId}:${stock.sparePartId}`} value={`${stock.storeId}:${stock.sparePartId}`}>
                    {stock.label} · คงเหลือ {stock.available} {stock.unit}
                  </option>
                ))}
                {!filteredStocks.length ? (
                  <option disabled value="">
                    ไม่พบอะไหล่ตามตัวกรอง
                  </option>
                ) : null}
              </select>
            </label>
            <label className={labelClass}>
              จำนวนที่ขอ
              <input className={inputClass} min="0.01" name="requestedQty" required step="0.01" type="number" />
            </label>
            <button
              aria-label={`ลบรายการที่ ${index + 1}`}
              className="flex size-12 items-center justify-center rounded-xl border border-red-500/30 text-red-600 transition hover:bg-red-500/10 disabled:opacity-35"
              disabled={lineIds.length === 1}
              onClick={() => setLineIds((current) => current.filter((item) => item !== lineId))}
              type="button"
            >
              <Minus size={18} />
            </button>
          </div>
        ))}
      </div>

      {!stocks.length ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-300">
          ยังไม่มี Stock ที่พร้อมให้เบิกใน Site นี้
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-lg backdrop-blur">
        <span className="hidden items-center gap-2 text-sm font-semibold text-[var(--muted)] sm:flex">
          <PackageSearch size={18} />
          ตรวจสอบรายการก่อนส่ง
        </span>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] disabled:opacity-45 sm:flex-none"
          disabled={!stocks.length}
        >
          <Send size={18} />
          ส่งคำขอเบิก
        </button>
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <select aria-label={label} className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="ALL">ทั้งหมด</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildFilterOptions(stocks: StockOption[]) {
  return {
    stores: uniqueSorted(stocks.map((stock) => stock.storeName ?? stock.storeCode ?? "")),
    types: uniqueSorted(stocks.map((stock) => stock.storeCategoryName ?? "")),
    categories: uniqueSorted(stocks.map((stock) => stock.sparePartCategoryName ?? "")),
    units: uniqueSorted(stocks.map((stock) => stock.unit)),
    zones: uniqueSorted(stocks.flatMap((stock) => stock.zoneNames ?? [])),
    stockStatuses: ["ENOUGH", "LOW", "OUT"],
  };
}

function matchesStockFilters(stock: StockOption, filters: StockFilters) {
  const search = filters.search.trim().toLowerCase();
  const haystack = [
    stock.label,
    stock.storeCode,
    stock.storeName,
    stock.sparePartCode,
    stock.sparePartName,
    stock.itemCode,
    stock.sparePartCategoryName,
    stock.storeCategoryName,
    ...(stock.zoneNames ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (!search || haystack.includes(search)) &&
    matchesFilter(filters.store, stock.storeName ?? stock.storeCode) &&
    matchesFilter(filters.type, stock.storeCategoryName) &&
    matchesFilter(filters.category, stock.sparePartCategoryName) &&
    matchesFilter(filters.unit, stock.unit) &&
    matchesFilter(filters.stockStatus, stock.stockStatus) &&
    (filters.zone === "ALL" || (stock.zoneNames ?? []).includes(filters.zone))
  );
}

function matchesFilter(filterValue: string, candidate?: string | null) {
  return filterValue === "ALL" || candidate === filterValue;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
