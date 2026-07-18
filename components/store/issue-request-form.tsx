"use client";

import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  FileText,
  FilterX,
  Minus,
  PackageSearch,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { SparePartBarcodeScanner } from "./spare-part-barcode-scanner";

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
  sparePartTypeName?: string;
  sparePartCategoryName?: string;
  itemCode?: string | null;
  stockStatus?: StockStatus;
};

type IssueZoneOption = { id: string; name: string; code: string };

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
  stockStatus: string;
};

type IssueLine = {
  id: number;
  stockKey: string;
  zoneId: string;
  requestedQty: string;
};

const initialFilters: StockFilters = {
  search: "",
  store: "ALL",
  type: "ALL",
  category: "ALL",
  unit: "ALL",
  stockStatus: "ALL",
};

export function IssueRequestForm({
  action,
  organizationId,
  plantId,
  stocks,
  issueZones,
  cmWorks,
  publicRequester,
  inventoryCode,
  lockedCmWork,
}: {
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  stocks: StockOption[];
  issueZones: IssueZoneOption[];
  cmWorks: CmOption[];
  publicRequester?: { contactRequired: boolean };
  inventoryCode?: string;
  lockedCmWork?: CmOption;
}) {
  const [issueType, setIssueType] = useState<"CM_REFERENCED" | "DIRECT">("CM_REFERENCED");
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<IssueLine[]>([{ id: 1, stockKey: "", zoneId: "", requestedQty: "" }]);
  const [filters, setFilters] = useState<StockFilters>(initialFilters);
  const [reviewMode, setReviewMode] = useState(false);
  const selectedIssueType = lockedCmWork ? "CM_REFERENCED" : issueType;
  const filterOptions = useMemo(() => buildFilterOptions(stocks), [stocks]);
  const filteredStocks = useMemo(() => stocks.filter((stock) => matchesStockFilters(stock, filters)), [filters, stocks]);

  function addLine() {
    setLines((current) => [
      ...current,
      { id: Math.max(...current.map((line) => line.id)) + 1, stockKey: "", zoneId: "", requestedQty: "" },
    ]);
  }

  function selectScannedStock(stockKey: string) {
    setFilters(initialFilters);
    setLines((current) => {
      const emptyIndex = current.findIndex((line) => !line.stockKey);
      if (emptyIndex >= 0) {
        return current.map((line, index) => index === emptyIndex ? { ...line, stockKey, zoneId: "" } : line);
      }
      return [
        ...current,
        { id: Math.max(...current.map((line) => line.id)) + 1, stockKey, zoneId: "", requestedQty: "" },
      ];
    });
  }

  function resetFormView() {
    setIssueType("CM_REFERENCED");
    setLines([{ id: 1, stockKey: "", zoneId: "", requestedQty: "" }]);
    setFilters(initialFilters);
    setReviewMode(false);
    formRef.current?.reset();
  }

  function openReview() {
    if (!formRef.current?.reportValidity()) return;
    setReviewMode(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form action={action} className="space-y-4" ref={formRef}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="plantId" type="hidden" value={plantId} />
      {inventoryCode ? <input name="inventoryCode" type="hidden" value={inventoryCode} /> : null}
      {lockedCmWork ? (
        <>
          <input name="issueType" type="hidden" value="CM_REFERENCED" />
          <input name="cmWorkNumber" type="hidden" value={lockedCmWork.number} />
        </>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
        <SectionHeading icon={<FileText size={19} />} title="ข้อมูลการเบิก" />
        <div className="grid gap-4 p-4 sm:p-5">
          {publicRequester ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                ชื่อ-นามสกุล ผู้เบิก
                <input className={inputClass} name="requesterName" required />
              </label>
              <label className={labelClass}>
                หน่วยงาน / แผนก
                <input className={inputClass} name="requesterDepartment" required />
              </label>
              <label className={labelClass}>
                เบอร์ติดต่อ / ช่องทางติดต่อ {publicRequester.contactRequired ? "" : "(ไม่บังคับ)"}
                <input className={inputClass} name="requesterContact" required={publicRequester.contactRequired} />
              </label>
            </div>
          ) : null}

          {lockedCmWork ? (
            <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-4 py-3 text-sm">
              <p className="font-extrabold text-[var(--primary)]">Store Request สำหรับงานนี้</p>
              <p className="mt-1 text-[var(--muted)]">{lockedCmWork.number} · {lockedCmWork.label}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <fieldset className="grid gap-1.5 md:col-span-2">
                <legend className="text-sm font-bold">ประเภทการเบิก</legend>
                <div className="grid grid-cols-2 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-1">
                  {[
                    ["CM_REFERENCED", "ดำเนินงาน CM", Wrench],
                    ["DIRECT", "เบิกโดยตรง", ClipboardCheck],
                  ].map(([value, label, Icon]) => (
                    <label
                      className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-center text-sm font-bold ${
                        issueType === value ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)]"
                      }`}
                      key={String(value)}
                    >
                      <input
                        checked={issueType === value}
                        className="sr-only"
                        name="issueType"
                        onChange={() => setIssueType(value as typeof issueType)}
                        type="radio"
                        value={String(value)}
                      />
                      <Icon size={16} />
                      {String(label)}
                    </label>
                  ))}
                </div>
              </fieldset>

              {selectedIssueType === "CM_REFERENCED" ? (
                <label className={labelClass}>
                  เลขที่ CM ภายใน Site
                  <select className={inputClass} defaultValue="" name="cmWorkNumber" required>
                    <option disabled value="">ค้นหาและเลือกเลขที่ CM</option>
                    {cmWorks.map((work) => (
                      <option key={work.id} value={work.number}>{work.number} · {work.label}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className={labelClass}>
                  เหตุผลการเบิกโดยตรง
                  <input className={inputClass} name="note" required />
                </label>
              )}

              <div className="grid gap-1.5 text-sm font-bold">
                วันที่ขอเบิก
                <div className={`${inputClass} flex items-center text-[var(--muted)]`}>ระบบบันทึกอัตโนมัติ</div>
              </div>
            </div>
          )}

          {selectedIssueType === "CM_REFERENCED" && !lockedCmWork ? (
            <label className={labelClass}>
              รายละเอียดการเบิก / เหตุผล / งานที่เกี่ยวข้อง
              <textarea className={`${inputClass} min-h-20 resize-y py-3`} name="note" placeholder="ระบุรายละเอียดเพิ่มเติม (ไม่บังคับ)" />
            </label>
          ) : null}
        </div>
      </section>

      {!reviewMode ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
          <SectionHeading
            action={(
              <div className="flex flex-wrap gap-2">
                {publicRequester ? (
                  <SparePartBarcodeScanner
                    onSelect={selectScannedStock}
                    options={stocks.map((stock) => ({
                      stockKey: `${stock.storeId}:${stock.sparePartId}`,
                      itemCode: stock.itemCode,
                      sparePartCode: stock.sparePartCode,
                      sparePartName: stock.sparePartName,
                    }))}
                  />
                ) : null}
                <button className={secondaryButtonClass} onClick={addLine} type="button">
                  <Plus size={17} /> เพิ่มรายการ
                </button>
              </div>
            )}
            icon={<ShoppingCart size={19} />}
            title="รายการอะไหล่"
          />

          <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--soft)]/65 p-4 sm:grid-cols-2 2xl:grid-cols-3">
            <label className={labelClass}>
              ค้นหาอะไหล่
              <span className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
                <input
                  aria-label="Search spare parts"
                  className={`${inputClass} pl-10`}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="รหัส, Item code, ชื่ออะไหล่"
                  value={filters.search}
                />
              </span>
            </label>
            <FilterSelect label="คลังอะไหล่" options={filterOptions.stores} value={filters.store} onChange={(value) => setFilters((current) => ({ ...current, store: value }))} />
            <FilterSelect label="ประเภท" options={filterOptions.types} value={filters.type} onChange={(value) => setFilters((current) => ({ ...current, type: value }))} />
            <FilterSelect label="หมวดหมู่" options={filterOptions.categories} value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} />
            <FilterSelect label="หน่วยนับ" options={filterOptions.units} value={filters.unit} onChange={(value) => setFilters((current) => ({ ...current, unit: value }))} />
            <FilterSelect label="สถานะสต๊อก" options={filterOptions.stockStatuses} value={filters.stockStatus} onChange={(value) => setFilters((current) => ({ ...current, stockStatus: value }))} />
            <button className={`${secondaryButtonClass} self-end`} onClick={() => setFilters(initialFilters)} type="button">
              <FilterX size={17} /> ล้างตัวกรอง
            </button>
          </div>

          <div className="max-w-full p-3 sm:p-4">
            <div className="w-full overflow-hidden rounded-xl border border-[var(--line)]">
              <div className="hidden grid-cols-[40px_minmax(210px,1fr)_minmax(150px,.72fr)_90px_44px] bg-[var(--soft)] px-3 py-3 text-xs font-extrabold text-[var(--muted)] 2xl:grid">
                <span>ลำดับ</span><span>อะไหล่ / คลัง</span><span>Zone ที่นำไปใช้งาน</span><span>จำนวน</span><span className="sr-only">จัดการ</span>
              </div>
              {lines.map((line, index) => {
                const stock = stockForKey(stocks, line.stockKey);
                return (
                  <div className="grid gap-3 border-t border-[var(--line)] bg-[var(--surface)] p-3 2xl:grid-cols-[40px_minmax(210px,1fr)_minmax(150px,.72fr)_90px_44px] 2xl:items-end 2xl:gap-0 2xl:px-3" key={line.id}>
                    <span className="inline-flex size-8 items-center justify-center self-center rounded-lg bg-[var(--soft)] text-sm font-extrabold text-[var(--primary)] 2xl:size-auto 2xl:justify-start 2xl:bg-transparent">{index + 1}</span>
                    <label className={`${labelClass} 2xl:pr-3`}>
                      <span className="text-xs text-[var(--muted)] 2xl:sr-only">อะไหล่ / คลัง</span>
                      <select
                        className={inputClass}
                        name="stockKey"
                        onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, stockKey: event.target.value, zoneId: "" } : item))}
                        required
                        value={line.stockKey}
                      >
                        <option disabled value="">เลือกอะไหล่จาก Stock</option>
                        {filteredStocks.map((option) => (
                          <option key={`${option.storeId}:${option.sparePartId}`} value={`${option.storeId}:${option.sparePartId}`}>
                            {option.label} · คงเหลือ {option.available} {option.unit}
                          </option>
                        ))}
                      </select>
                      {stock ? <span className="truncate text-xs font-medium text-[var(--muted)]">คงเหลือ {stock.available} {stock.unit} · {stock.storeName}</span> : null}
                    </label>
                    <label className={`${labelClass} 2xl:pr-3`}>
                      <span className="text-xs text-[var(--muted)] 2xl:sr-only">Zone ที่นำไปใช้งาน</span>
                      <select
                        className={inputClass}
                        disabled={!line.stockKey || !issueZones.length}
                        name="zoneId"
                        onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, zoneId: event.target.value } : item))}
                        required
                        value={line.zoneId}
                      >
                        <option value="">{!line.stockKey ? "เลือกอะไหล่ก่อน" : issueZones.length ? "เลือก Zone" : "ไม่มี Applicable Zone"}</option>
                        {issueZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}
                      </select>
                    </label>
                    <label className={`${labelClass} 2xl:pr-3`}>
                      <span className="text-xs text-[var(--muted)] 2xl:sr-only">จำนวนที่ขอ</span>
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        max={stock?.available}
                        min="1"
                        name="requestedQty"
                        onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, requestedQty: event.target.value } : item))}
                        required
                        step="1"
                        type="number"
                        value={line.requestedQty}
                      />
                    </label>
                    <button
                      aria-label={`ลบรายการที่ ${index + 1}`}
                      className="flex size-11 items-center justify-center rounded-lg border border-red-500/25 text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                      disabled={lines.length === 1}
                      onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                      type="button"
                    >
                      <Minus size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <ReviewPanel issueZones={issueZones} lines={lines} stocks={stocks} />
      )}

      {!stocks.length ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-300">
          ยังไม่มี Stock ที่พร้อมให้เบิกใน Site นี้
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-lg backdrop-blur">
        <button className={secondaryButtonClass} onClick={reviewMode ? () => setReviewMode(false) : resetFormView} type="button">
          {reviewMode ? <ArrowLeft size={18} /> : null}
          {reviewMode ? "กลับไปแก้ไข" : "ยกเลิก"}
        </button>
        {reviewMode ? (
          <button className={primaryButtonClass} disabled={!stocks.length}>
            <Send size={18} /> ยืนยันและส่งคำขอเบิก
          </button>
        ) : (
          <button className={primaryButtonClass} disabled={!stocks.length} onClick={openReview} type="button">
            ถัดไป: ตรวจสอบและยืนยัน <ArrowRight size={18} />
          </button>
        )}
      </div>
    </form>
  );
}

function SectionHeading({ action, icon, title }: { action?: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
      <h3 className="flex items-center gap-2 text-lg font-extrabold"><span className="text-[var(--primary)]">{icon}</span>{title}</h3>
      {action}
    </div>
  );
}

function ReviewPanel({ issueZones, lines, stocks }: { issueZones: IssueZoneOption[]; lines: IssueLine[]; stocks: StockOption[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <SectionHeading icon={<ClipboardCheck size={19} />} title="ตรวจสอบและยืนยัน" />
      <div className="grid gap-3 p-4 sm:p-5">
        {lines.map((line, index) => {
          const stock = stockForKey(stocks, line.stockKey);
          const zone = issueZones.find((item) => item.id === line.zoneId);
          return (
            <article className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center" key={line.id}>
              <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-extrabold text-white">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-extrabold">{stock?.sparePartName ?? stock?.label ?? "-"}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{stock?.sparePartCode ?? "-"} · {stock?.storeName ?? "-"} · Zone {zone ? `${zone.code} ${zone.name}` : "-"}</p>
              </div>
              <p className="font-extrabold text-[var(--primary)]">{line.requestedQty || "0"} {stock?.unit ?? ""}</p>
            </article>
          );
        })}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] p-4 text-sm font-bold">
          <input className="mt-0.5 size-5 accent-[var(--primary)]" required type="checkbox" />
          <span>ตรวจสอบข้อมูล เลขที่ CM, Zone และจำนวนอะไหล่ถูกต้องแล้ว</span>
        </label>
      </div>
    </section>
  );
}

function stockForKey(stocks: StockOption[], stockKey: string) {
  return stocks.find((stock) => `${stock.storeId}:${stock.sparePartId}` === stockKey);
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
    types: uniqueSorted(stocks.map((stock) => stock.sparePartTypeName ?? "")),
    categories: uniqueSorted(stocks.map((stock) => stock.sparePartCategoryName ?? "")),
    units: uniqueSorted(stocks.map((stock) => stock.unit)),
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
    stock.sparePartTypeName,
    stock.sparePartCategoryName,
    stock.storeCategoryName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (!search || haystack.includes(search)) &&
    matchesFilter(filters.store, stock.storeName ?? stock.storeCode) &&
    matchesFilter(filters.type, stock.sparePartTypeName) &&
    matchesFilter(filters.category, stock.sparePartCategoryName) &&
    matchesFilter(filters.unit, stock.unit) &&
    matchesFilter(filters.stockStatus, stock.stockStatus)
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
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-bold text-white hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-45";
