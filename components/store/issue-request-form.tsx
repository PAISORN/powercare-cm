"use client";

import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Droplets,
  FilterX,
  Minus,
  Package,
  PackageSearch,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SparePartBarcodeScanner } from "./spare-part-barcode-scanner";

type StockStatus = "ENOUGH" | "LOW" | "OUT";

type StockOption = {
  storeId: string;
  sparePartId: string;
  sparePartItemKind?: string;
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
  sparePartMaterialGroupName?: string;
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
  materialGroup: string;
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
  materialGroup: "ALL",
  unit: "ALL",
  stockStatus: "ALL",
};

function createSubmissionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
  directOnly = false,
  singleCard = false,
  initialItemKind = "SPARE_PART",
  requesterSummary,
  siteSummary,
}: {
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  stocks: StockOption[];
  issueZones: IssueZoneOption[];
  cmWorks: CmOption[];
  publicRequester?: { contactRequired?: boolean };
  inventoryCode?: string;
  lockedCmWork?: CmOption;
  directOnly?: boolean;
  singleCard?: boolean;
  initialItemKind?: "SPARE_PART" | "CHEMICAL" | "OIL";
  requesterSummary?: { name: string; department?: string | null };
  siteSummary?: { organizationName: string; plantName: string; inventoryCode?: string };
}) {
  const [issueType, setIssueType] = useState<"CM_REFERENCED" | "DIRECT">(directOnly ? "DIRECT" : "CM_REFERENCED");
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<IssueLine[]>([{ id: 1, stockKey: "", stockSearch: "", zoneId: "", requestedQty: "" }]);
  const [filters, setFilters] = useState<StockFilters>(initialFilters);
  const [reviewMode, setReviewMode] = useState(false);
  const [formError, setFormError] = useState("");
  const submittingRef = useRef(false);
  const [submissionKey, setSubmissionKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemKind, setItemKind] = useState<"SPARE_PART" | "CHEMICAL" | "OIL">(initialItemKind);
  const selectedIssueType = lockedCmWork ? "CM_REFERENCED" : directOnly ? "DIRECT" : issueType;
  const kindStocks = useMemo(
    () => stocks.filter((stock) => (stock.sparePartItemKind ?? "SPARE_PART") === itemKind),
    [itemKind, stocks],
  );
  const filterOptions = useMemo(() => buildFilterOptions(kindStocks), [kindStocks]);
  const filteredStocks = useMemo(
    () => kindStocks.filter((stock) => matchesStockFilters(stock, filters)),
    [filters, kindStocks],
  );
  const kindNoun = itemKind === "CHEMICAL" ? "สารเคมี" : itemKind === "OIL" ? "น้ำมัน" : "อะไหล่";
  const KindIcon = itemKind === "CHEMICAL" ? Beaker : itemKind === "OIL" ? Droplets : Package;
  const activeStoreNames = useMemo(
    () => [...new Set(kindStocks.map((stock) => stock.storeName).filter(Boolean))],
    [kindStocks],
  );
  useEffect(() => {
    setSubmissionKey(createSubmissionKey());
  }, []);

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
    setIssueType(directOnly ? "DIRECT" : "CM_REFERENCED");
    setItemKind(initialItemKind);
    setLines([{ id: 1, stockKey: "", stockSearch: "", zoneId: "", requestedQty: "" }]);
    setFilters(initialFilters);
    setReviewMode(false);
    setFormError("");
    submittingRef.current = false;
    setIsSubmitting(false);
    setSubmissionKey(createSubmissionKey());
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
      className={singleCard ? "space-y-6 md:-mx-5 md:-mb-5" : "space-y-6"}
      data-testid="issue-request-form"
      onSubmit={(event) => {
        if (reviewMode) {
          if (submittingRef.current) {
            event.preventDefault();
            return;
          }
          submittingRef.current = true;
          setIsSubmitting(true);
          return;
        }
        event.preventDefault();
        openReview();
      }}
      ref={formRef}
    >
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="plantId" type="hidden" value={plantId} />
      <input name="submissionKey" type="hidden" value={submissionKey} />
      <input name="itemKind" type="hidden" value={itemKind} />
      {inventoryCode ? <input name="inventoryCode" type="hidden" value={inventoryCode} /> : null}
      {lockedCmWork ? (
        <>
          <input name="issueType" type="hidden" value="CM_REFERENCED" />
          <input name="cmWorkNumber" type="hidden" value={lockedCmWork.number} />
        </>
      ) : directOnly ? <input name="issueType" type="hidden" value="DIRECT" /> : null}

      <header className={`px-1 py-2 ${singleCard ? "text-white" : "text-[var(--ink)]"}`}>
        <div className="flex items-start gap-4">
          <span className={`mt-1 grid size-20 shrink-0 place-items-center rounded-2xl border ${singleCard ? "border-white/25 bg-white/10 text-white" : "border-[var(--line)] bg-[var(--soft)] text-[var(--primary)]"}`}>
            <KindIcon aria-hidden="true" size={38} strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black leading-tight sm:text-3xl">สร้างใบเบิก</h2>
            <p className={`mt-1 text-sm font-bold ${singleCard ? "text-white/80" : "text-[var(--primary)]"}`}>PowerCare Store · {kindNoun}</p>
            <div className="mt-3 flex flex-nowrap items-center gap-1 text-[11px] font-bold sm:gap-2 sm:text-xs">
              {siteSummary ? (
                <span className={`whitespace-nowrap rounded-full px-2 py-1.5 sm:px-2.5 ${singleCard ? "bg-white/10 text-white/90" : "bg-[var(--soft)] text-[var(--ink)]"}`}>
                  {siteSummary.inventoryCode ?? siteSummary.plantName}
                </span>
              ) : null}
              <span className={`whitespace-nowrap rounded-full px-2 py-1.5 sm:px-2.5 ${singleCard ? "bg-white/10 text-white/80" : "bg-[var(--soft)] text-[var(--muted)]"}`}>
                {activeStoreNames[0] ?? `คลัง${kindNoun}`} · {kindStocks.length.toLocaleString("th-TH")} รายการ
              </span>
              <span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2 py-1.5 sm:gap-1.5 sm:px-2.5 ${singleCard ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"}`}>
                <span className="size-2 rounded-full bg-emerald-400" /> เปิดให้บริการ
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="overflow-visible rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <SectionHeading icon={<UserRound size={19} />} title="ผู้เบิก" />
        <div className="grid gap-4 p-4 sm:p-5">
          {requesterSummary ? (
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/15">
                  <UserRound size={25} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--muted)]">ผู้เบิก</p>
                  <p className="mt-1 truncate text-lg font-black text-[var(--ink)]">{requesterSummary.name}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className={labelClass}>
                  หน่วยงาน / แผนก
                  <span className={`${inputClass} flex items-center gap-3 font-semibold`}>
                    <Building2 className="shrink-0 text-[var(--primary)]" size={20} />
                    {requesterSummary.department || "-"}
                  </span>
                </label>
                <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--soft)] px-4 text-sm font-semibold text-[var(--muted)]">
                  <CalendarDays size={17} /> {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date())}
                </span>
              </div>
            </div>
          ) : null}
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
            </div>
          ) : null}

          {lockedCmWork ? (
            <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-4 py-3 text-sm">
              <p className="font-extrabold text-[var(--primary)]">Store Request สำหรับงานนี้</p>
              <p className="mt-1 text-[var(--muted)]">{lockedCmWork.number} · {lockedCmWork.label}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {!directOnly ? <fieldset className="grid gap-1.5 md:col-span-2">
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
              </fieldset> : null}

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
                  เหตุผลการเบิก
                  <input className={inputClass} name="note" required />
                </label>
              )}

            </div>
          )}

          {selectedIssueType === "CM_REFERENCED" && !lockedCmWork ? (
            <label className={labelClass}>
              รายละเอียดการเบิก / เหตุผล / งานที่เกี่ยวข้อง
              <textarea className={`${inputClass} min-h-20 resize-y py-3`} name="note" placeholder="ระบุรายละเอียดเพิ่มเติม (ไม่บังคับ)" />
            </label>
          ) : null}

          {itemKind === "OIL" ? (
            <fieldset className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/45 p-4 shadow-[var(--shadow)] sm:grid-cols-2">
              <legend className="px-2 font-extrabold">ข้อมูลรถและการจ่ายน้ำมัน</legend>
              <label className={labelClass}>
                รถที่นำไปใช้
                <input className={inputClass} name="vehicle" placeholder="ทะเบียนรถ / ชื่อรถ / รหัสรถ" required />
              </label>
              <label className={labelClass}>
                เลขไมล์ก่อนเติม
                <input className={inputClass} inputMode="decimal" min="0" name="odometerBefore" placeholder="0" required step="0.01" type="number" />
              </label>
              <label className={labelClass}>
                เลขไมล์หลังเติม
                <input className={inputClass} inputMode="decimal" min="0" name="odometerAfter" placeholder="0" required step="0.01" type="number" />
              </label>
              <label className={labelClass}>
                มิเตอร์หัวจ่ายก่อนเติม
                <input className={inputClass} inputMode="decimal" min="0" name="dispenserMeterBefore" placeholder="0.00" required step="0.01" type="number" />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                มิเตอร์หัวจ่ายหลังเติม
                <input className={inputClass} inputMode="decimal" min="0" name="dispenserMeterAfter" placeholder="0.00" required step="0.01" type="number" />
              </label>
            </fieldset>
          ) : null}
        </div>
      </section>

      <section className="overflow-visible">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">เลือกประเภทและรายการ</p>
              <h3 className="mt-1 text-2xl font-black text-[var(--ink)]">รายการที่ต้องการเบิก</h3>
            </div>
            <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-extrabold text-[var(--primary)]">
              {lines.filter((line) => line.stockKey).length} รายการ
            </span>
          </div>

          <div className="border-b border-[var(--line)]">
            <div className="grid grid-cols-3" role="tablist" aria-label="ประเภทสิ่งของที่ต้องการเบิก">
              {([
                ["SPARE_PART", "อะไหล่", Package],
                ["CHEMICAL", "สารเคมี", Beaker],
                ["OIL", "น้ำมัน", Droplets],
              ] as const).map(([value, label, Icon]) => (
                <button
                  aria-selected={itemKind === value}
                  className={`relative flex min-h-16 min-w-0 items-center justify-center gap-2 whitespace-nowrap px-2 text-sm font-extrabold transition-colors sm:px-4 sm:text-base ${
                    itemKind === value ? "text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                  }`}
                  key={value}
                  onClick={() => {
                    setItemKind(value);
                    setFilters(initialFilters);
                    setLines([{ id: 1, stockKey: "", stockSearch: "", zoneId: "", requestedQty: "" }]);
                  }}
                  role="tab"
                  type="button"
                >
                  <Icon size={21} />
                  {label}
                  {itemKind === value ? <span className="absolute inset-x-3 bottom-0 h-1 rounded-t-full bg-[var(--primary)]" /> : null}
                </button>
              ))}
            </div>
          </div>

          <details className="group mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--soft)]/65 shadow-[var(--shadow)]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-extrabold text-[var(--muted)]">
              <span className="inline-flex items-center gap-2"><FilterX size={17} /> ตัวกรองเพิ่มเติม</span>
              <span className="text-[var(--primary)] group-open:hidden">เปิด</span>
              <span className="hidden text-[var(--primary)] group-open:inline">ปิด</span>
            </summary>
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 2xl:grid-cols-3">
            <FilterSelect label="คลังอะไหล่" options={filterOptions.stores} value={filters.store} onChange={(value) => setFilters((current) => ({ ...current, store: value }))} />
            <FilterSelect label="ประเภท" options={filterOptions.types} value={filters.type} onChange={(value) => setFilters((current) => ({ ...current, type: value }))} />
            <FilterSelect label="หมวดหมู่" options={filterOptions.categories} value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value, materialGroup: "ALL" }))} />
            <FilterSelect
              disabled={filters.category === "ALL"}
              label="กลุ่มอะไหล่/วัสดุ"
              options={uniqueSorted(kindStocks.filter((stock) => stock.sparePartCategoryName === filters.category).map((stock) => stock.sparePartMaterialGroupName ?? ""))}
              value={filters.materialGroup}
              onChange={(value) => setFilters((current) => ({ ...current, materialGroup: value }))}
            />
            <FilterSelect label="หน่วยนับ" options={filterOptions.units} value={filters.unit} onChange={(value) => setFilters((current) => ({ ...current, unit: value }))} />
            <FilterSelect label="สถานะสต๊อก" options={filterOptions.stockStatuses} value={filters.stockStatus} onChange={(value) => setFilters((current) => ({ ...current, stockStatus: value }))} />
            <button className={`${secondaryButtonClass} self-end`} onClick={() => setFilters(initialFilters)} type="button">
              <FilterX size={17} /> ล้างตัวกรอง
            </button>
          </div>
          </details>

          <div className="max-w-full pt-3">
            <div className="w-full overflow-visible rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              {lines.map((line, index) => {
                const stock = stockForKey(stocks, line.stockKey);
                return (
                  <article className="relative grid grid-cols-12 gap-x-2 gap-y-4 border-b border-[var(--line)] p-4 transition last:border-b-0 hover:bg-[var(--soft)]/60 sm:gap-x-3 sm:p-5" key={line.id}>
                    <label className={`${labelClass} col-span-12`}>
                      <span className="flex h-5 items-center gap-3 text-xs text-[var(--muted)]">
                        <strong className="text-base font-black leading-none text-[var(--primary)]">{String(index + 1).padStart(2, "0")}</strong>
                        {kindNoun} / คลัง
                      </span>
                      <SearchableStockSelect
                        line={line}
                        onChange={(next) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, ...next } : item))}
                        stocks={filteredStocks}
                      />
                      {stock ? <span className="truncate text-xs font-medium text-[var(--muted)]">คงเหลือ {stock.available} {stock.unit} · {stock.storeName}</span> : null}
                    </label>
                    <label className={`${labelClass} col-span-5 col-start-1`}>
                      <span className="text-xs text-[var(--muted)]">Zone ที่นำไปใช้งาน</span>
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
                    <label className={`${labelClass} col-span-4`}>
                      <span className="text-xs text-[var(--muted)]">จำนวน</span>
                      <div className="grid grid-cols-[36px_minmax(36px,1fr)_36px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                        <button
                          aria-label="ลดจำนวน"
                          className="grid min-h-12 place-items-center text-[var(--primary)] hover:bg-[var(--soft)]"
                          onClick={() => setLines((current) => current.map((item) => item.id === line.id ? { ...item, requestedQty: String(Math.max(1, Number(item.requestedQty || 1) - 1)) } : item))}
                          type="button"
                        ><Minus size={18} /></button>
                        <input
                          className="min-w-0 border-x border-[var(--line)] bg-transparent px-2 text-center text-lg font-black outline-none"
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
                        <button
                          aria-label="เพิ่มจำนวน"
                          className="grid min-h-12 place-items-center text-[var(--primary)] hover:bg-[var(--soft)]"
                          onClick={() => setLines((current) => current.map((item) => item.id === line.id ? { ...item, requestedQty: String(Math.min(stock?.available ?? Number.MAX_SAFE_INTEGER, Number(item.requestedQty || 0) + 1)) } : item))}
                          type="button"
                        ><Plus size={18} /></button>
                      </div>
                    </label>
                    <div className="col-span-1 col-start-12 row-start-2 flex items-end justify-end">
                      <button
                        aria-label={`ลบรายการที่ ${index + 1}`}
                        className="flex size-11 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5 text-red-600 transition hover:bg-red-500/10 disabled:opacity-30"
                        disabled={lines.length === 1}
                        onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                        type="button"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className={`mt-3 grid grid-cols-[minmax(0,1.35fr)_minmax(0,.85fr)] gap-2 ${publicRequester ? "" : "grid-cols-1"}`}>
              <button className={`${secondaryButtonClass} min-h-14 justify-center border-dashed border-[var(--primary)]/60 text-[var(--primary)]`} onClick={addLine} type="button">
                <Plus size={17} /> เพิ่มรายการ
              </button>
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
            </div>
          </div>
      </section>

      {formError ? (
        <p className={`${singleCard ? "mx-4 mt-4 sm:mx-5" : ""} rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600`} role="alert">
          {formError}
        </p>
      ) : null}

      {!stocks.length ? (
        <p className={`${singleCard ? "mx-4 mt-4 sm:mx-5" : ""} rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-300`}>
          ยังไม่มี Stock ที่พร้อมให้เบิกใน Site นี้
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className={`${secondaryButtonClass} max-sm:hidden`} onClick={resetFormView} type="button">
          ยกเลิก
        </button>
        <div className="min-w-0 sm:mr-auto">
          <p className="text-sm font-extrabold">รวม {lines.filter((line) => line.stockKey).length} รายการ</p>
          <p className="text-xs text-[var(--muted)]">จำนวนรวม {lines.reduce((sum, line) => sum + Number(line.requestedQty || 0), 0).toLocaleString("th-TH")} หน่วย</p>
        </div>
        <button className={`${primaryButtonClass} min-h-14 justify-center max-sm:w-full sm:min-w-72`} disabled={!kindStocks.length} onClick={openReview} type="button">
          <ClipboardCheck size={19} /> ตรวจสอบและเสร็จสิ้น <ArrowRight size={18} />
        </button>
      </div>

      {reviewMode ? (
        <ReviewModal
          isSubmitting={isSubmitting}
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

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid min-h-16 grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 py-2">
      <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">{icon}</span>
      <span className="font-bold">{label}</span>
      <span className="text-right font-semibold text-[var(--ink)]">{value}</span>
    </div>
  );
}

function ReviewModal({ isSubmitting, issueZones, lines, onBack, stocks }: {
  isSubmitting: boolean;
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
            <button className={secondaryButtonClass} disabled={isSubmitting} onClick={onBack} type="button">
              <ArrowLeft size={18} /> ย้อนกลับไปแก้ไข
            </button>
            <button aria-busy={isSubmitting} className={primaryButtonClass} disabled={isSubmitting} type="submit">
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 288 });
  const options = useMemo(
    () => stocks.filter((stock) => matchesStockSearch(stock, line.stockSearch)).slice(0, 50),
    [line.stockSearch, stocks],
  );
  const selectedStock = stockForKey(stocks, line.stockKey);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(120, Math.min(288, placeAbove ? spaceAbove : spaceBelow));

      setMenuPosition({
        left: rect.left,
        top: placeAbove ? Math.max(8, rect.top - availableHeight - 4) : rect.bottom + 4,
        width: rect.width,
        maxHeight: availableHeight,
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  function selectStock(stock: StockOption) {
    onChange({
      stockKey: `${stock.storeId}:${stock.sparePartId}`,
      stockSearch: stockDisplayLabel(stock),
      zoneId: "",
    });
    setActiveIndex(-1);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input name="stockKey" type="hidden" value={line.stockKey} />
      {selectedStock ? (
        <button
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-left transition hover:border-[var(--primary)]"
          onClick={() => onChange({ stockKey: "", stockSearch: "", zoneId: "" })}
          type="button"
        >
          <span className="block truncate font-extrabold text-[var(--ink)]">{selectedStock.sparePartName ?? selectedStock.label}</span>
          <span className="mt-1 block truncate text-xs font-semibold text-[var(--muted)]">{selectedStock.sparePartCode ?? selectedStock.itemCode ?? "-"}</span>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--soft)] px-2 py-1 text-xs font-bold text-[var(--muted)]">
            <Package size={14} /> {selectedStock.storeCode ?? selectedStock.storeName ?? "-"}
          </span>
        </button>
      ) : <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]" size={17} />}
      <input
        aria-activedescendant={activeIndex >= 0 ? `stock-option-${line.id}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={`stock-options-${line.id}`}
        aria-expanded={open}
        aria-label={`ค้นหาและเลือกอะไหล่ รายการ ${line.id}`}
        aria-haspopup="listbox"
        autoComplete="off"
        className={line.stockKey ? "sr-only" : `${inputClass} pl-10`}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange({ stockKey: "", stockSearch: event.target.value, zoneId: "" });
          setActiveIndex(-1);
          setOpen(true);
        }}
        onFocus={() => {
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setActiveIndex(-1);
            setOpen(false);
            return;
          }

          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => {
              if (!options.length) return -1;
              if (event.key === "ArrowDown") return current >= options.length - 1 ? 0 : current + 1;
              return current <= 0 ? options.length - 1 : current - 1;
            });
            return;
          }

          if (event.key === "Enter" && open && activeIndex >= 0 && options[activeIndex]) {
            event.preventDefault();
            selectStock(options[activeIndex]);
          }
        }}
        placeholder="พิมพ์ชื่อ รหัส หรือ Item code"
        ref={inputRef}
        required
        role="combobox"
        value={line.stockSearch}
      />
      {open && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed z-[200] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-2xl"
          id={`stock-options-${line.id}`}
          role="listbox"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
          }}
        >
          {options.length ? options.map((stock, index) => {
            const stockKey = `${stock.storeId}:${stock.sparePartId}`;
            const codes = [stock.sparePartCode, stock.itemCode].filter(Boolean).join(" · ") || "-";
            return (
              <button
                aria-selected={line.stockKey === stockKey}
                className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--soft)] ${activeIndex === index ? "bg-[var(--soft)]" : ""}`}
                id={`stock-option-${line.id}-${index}`}
                key={stockKey}
                onClick={() => selectStock(stock)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{stock.sparePartName ?? stock.label}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">{codes} · {stock.storeName ?? "-"}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">{stock.sparePartTypeName ?? "-"} · {stock.sparePartCategoryName ?? "-"}</span>
                </span>
                <span className="shrink-0 font-bold text-[var(--primary)]">{stock.available} {stock.unit}</span>
              </button>
            );
          }) : (
            <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">ไม่พบอะไหล่</p>
          )}
        </div>,
        document.body,
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
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <select aria-label={label} className={inputClass} disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
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
    materialGroups: uniqueSorted(stocks.map((stock) => stock.sparePartMaterialGroupName ?? "")),
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
    stock.sparePartMaterialGroupName,
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
    matchesFilter(filters.materialGroup, stock.sparePartMaterialGroupName) &&
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
