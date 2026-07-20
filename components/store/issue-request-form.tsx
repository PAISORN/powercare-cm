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
  stockSearch: string;
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
  const [lines, setLines] = useState<IssueLine[]>([{ id: 1, stockKey: "", stockSearch: "", zoneId: "", requestedQty: "" }]);
  const [filters, setFilters] = useState<StockFilters>(initialFilters);
  const [reviewMode, setReviewMode] = useState(false);
  const [formError, setFormError] = useState("");
  const selectedIssueType = lockedCmWork ? "CM_REFERENCED" : issueType;
  const filterOptions = useMemo(() => buildFilterOptions(stocks), [stocks]);
  const filteredStocks = useMemo(() => stocks.filter((stock) => matchesStockFilters(stock, filters)), [filters, stocks]);

  function addLine() {
    setLines((current) => [
      ...current,
      { id: Math.max(...current.map((line) => line.id)) + 1, stockKey: "", stockSearch: "", zoneId: "", requestedQty: "" },
    ]);
  }

  function selectScannedStock(stockKey: string) {
    setFilters(initialFilters);
    setLines((current) => {
      const emptyIndex = current.findIndex((line) => !line.stockKey);
      if (emptyIndex >= 0) {
        const stock = stockForKey(stocks, stockKey);
        return current.map((line, index) => index === emptyIndex ? {
          ...line,
          stockKey,
          stockSearch: stock ? stockDisplayLabel(stock) : "",
          zoneId: "",
        } : line);
      }
      return [
        ...current,
        {
          id: Math.max(...current.map((line) => line.id)) + 1,
          stockKey,
          stockSearch: stockForKey(stocks, stockKey) ? stockDisplayLabel(stockForKey(stocks, stockKey)!) : "",
          zoneId: "",
          requestedQty: "",
        },
      ];
    });
  }

  function resetFormView() {
    setIssueType("CM_REFERENCED");
    setLines([{ id: 1, stockKey: "", stockSearch: "", zoneId: "", requestedQty: "" }]);
    setFilters(initialFilters);
    setReviewMode(false);
    setFormError("");
    formRef.current?.reset();
  }

  function openReview() {
    if (!formRef.current?.reportValidity()) return;
    const invalidLine = lines.find((line) => {
      const stock = stockForKey(stocks, line.stockKey);
      const quantity = Number(line.requestedQty);
      return !stock || !line.zoneId || !Number.isInteger(quantity) || quantity <= 0 || quantity > stock.available;
    });
    if (invalidLine) {
      setFormError("กรุณาเลือกอะไหล่ Zone และระบุจำนวนเต็มที่ไม่เกินสต็อกให้ครบทุกแถว");
      return;
    }
    const totalByStock = new Map<string, number>();
    for (const line of lines) {
      totalByStock.set(line.stockKey, (totalByStock.get(line.stockKey) ?? 0) + Number(line.requestedQty));
    }
    const overStock = [...totalByStock].some(([stockKey, quantity]) => quantity > (stockForKey(stocks, stockKey)?.available ?? 0));
    if (overStock) {
      setFormError("จำนวนรวมของอะไหล่รายการเดียวกันเกินจำนวนคงเหลือ");
      return;
    }
    setFormError("");
    setReviewMode(true);
  }

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(event) => {
        if (reviewMode) return;
        event.preventDefault();
        openReview();
      }}
      ref={formRef}
    >
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
                      <SearchableStockSelect
                        line={line}
                        onChange={(next) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, ...next } : item))}
                        stocks={filteredStocks}
                      />
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

      {formError ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600" role="alert">
          {formError}
        </p>
      ) : null}

      {!stocks.length ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-300">
          ยังไม่มี Stock ที่พร้อมให้เบิกใน Site นี้
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-lg backdrop-blur">
        <button className={secondaryButtonClass} onClick={resetFormView} type="button">
          ยกเลิก
        </button>
        <button className={primaryButtonClass} disabled={!stocks.length} onClick={openReview} type="button">
          ถัดไป: ตรวจสอบและยืนยัน <ArrowRight size={18} />
        </button>
      </div>

      {reviewMode ? (
        <ReviewModal
          issueZones={issueZones}
          lines={lines}
          onBack={() => setReviewMode(false)}
          stocks={stocks}
        />
      ) : null}
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

function ReviewModal({ issueZones, lines, onBack, stocks }: {
  issueZones: IssueZoneOption[];
  lines: IssueLine[];
  onBack: () => void;
  stocks: StockOption[];
}) {
  return (
    <div aria-modal="true" className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm" role="dialog">
      <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        <SectionHeading icon={<ClipboardCheck size={19} />} title="ยืนยันรายการเบิกอะไหล่" />
        <div className="grid gap-3 p-4 sm:p-5">
        {lines.map((line, index) => {
          const stock = stockForKey(stocks, line.stockKey);
          const zone = issueZones.find((item) => item.id === line.zoneId);
          return (
            <article className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center" key={line.id}>
              <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-extrabold text-white">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-extrabold">{stock?.sparePartName ?? stock?.label ?? "-"}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">รหัส {stock?.sparePartCode ?? stock?.itemCode ?? "-"} · {stock?.storeName ?? "-"} · Zone {zone ? `${zone.code} ${zone.name}` : "-"}</p>
              </div>
              <p className="font-extrabold text-[var(--primary)]">{line.requestedQty || "0"} {stock?.unit ?? ""}</p>
            </article>
          );
        })}
          <div className="mt-2 flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end">
            <button className={secondaryButtonClass} onClick={onBack} type="button">
              <ArrowLeft size={18} /> ย้อนกลับไปแก้ไข
            </button>
            <button className={primaryButtonClass} type="submit">
              <Send size={18} /> ยืนยันการเบิก
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SearchableStockSelect({ line, onChange, stocks }: {
  line: IssueLine;
  onChange: (next: Partial<IssueLine>) => void;
  stocks: StockOption[];
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => stocks.filter((stock) => matchesStockSearch(stock, line.stockSearch)).slice(0, 50),
    [line.stockSearch, stocks],
  );

  return (
    <div className="relative">
      <input name="stockKey" type="hidden" value={line.stockKey} />
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]" size={17} />
      <input
        aria-expanded={open}
        aria-label={`ค้นหาและเลือกอะไหล่ รายการ ${line.id}`}
        aria-haspopup="listbox"
        autoComplete="off"
        className={`${inputClass} pl-10`}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange({ stockKey: "", stockSearch: event.target.value, zoneId: "" });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="พิมพ์ชื่อ รหัส หรือ Item code"
        required
        value={line.stockSearch}
      />
      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-xl" role="listbox">
          {options.length ? options.map((stock) => {
            const stockKey = `${stock.storeId}:${stock.sparePartId}`;
            return (
              <button
                aria-selected={line.stockKey === stockKey}
                className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--soft)]"
                key={stockKey}
                onClick={() => {
                  onChange({ stockKey, stockSearch: stockDisplayLabel(stock), zoneId: "" });
                  setOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{stock.sparePartName ?? stock.label}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">{stock.sparePartCode ?? stock.itemCode ?? "-"} · {stock.storeName ?? "-"}</span>
                </span>
                <span className="shrink-0 font-bold text-[var(--primary)]">{stock.available} {stock.unit}</span>
              </button>
            );
          }) : (
            <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">ไม่พบอะไหล่</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function stockForKey(stocks: StockOption[], stockKey: string) {
  return stocks.find((stock) => `${stock.storeId}:${stock.sparePartId}` === stockKey);
}

function stockDisplayLabel(stock: StockOption) {
  return `${stock.sparePartName ?? stock.label} · ${stock.sparePartCode ?? stock.itemCode ?? "-"}`;
}

function matchesStockSearch(stock: StockOption, value: string) {
  const search = value.trim().toLowerCase();
  if (!search) return true;
  return [stock.label, stock.sparePartName, stock.sparePartCode, stock.itemCode, stock.storeName, stock.sparePartTypeName, stock.sparePartCategoryName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search);
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
