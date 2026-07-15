"use client";

import { FilterX, Minus, PackagePlus, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

type StoreOption = { id: string; name: string; code: string; categoryName?: string };
type SparePartOption = {
  id: string;
  name: string;
  code: string;
  itemCode?: string | null;
  unit: string;
  minStock: number;
  categoryName?: string;
  typeName?: string;
  stocks: Array<{ storeId: string; quantity: number }>;
};
type ReceiveLine = { id: number; storeId: string; sparePartId: string };
type StockStatus = "ALL" | "ENOUGH" | "LOW" | "OUT";
type ReceiveFilters = {
  search: string;
  storeId: string;
  type: string;
  category: string;
  unit: string;
  stockStatus: StockStatus;
};

const initialFilters: ReceiveFilters = {
  search: "",
  storeId: "ALL",
  type: "ALL",
  category: "ALL",
  unit: "ALL",
  stockStatus: "ALL",
};

type ReceiveStockFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  stores: StoreOption[];
  spareParts: SparePartOption[];
};

export function ReceiveStockForm({
  action,
  organizationId,
  plantId,
  stores,
  spareParts,
}: ReceiveStockFormProps) {
  const [lines, setLines] = useState<ReceiveLine[]>([{ id: 1, storeId: "", sparePartId: "" }]);
  const [filters, setFilters] = useState<ReceiveFilters>(initialFilters);
  const canSubmit = stores.length > 0 && spareParts.length > 0;
  const filterOptions = useMemo(() => ({
    types: uniqueSorted(spareParts.map((part) => part.typeName ?? "")),
    categories: uniqueSorted(spareParts.map((part) => part.categoryName ?? "")),
    units: uniqueSorted(spareParts.map((part) => part.unit)),
  }), [spareParts]);
  const filteredSpareParts = useMemo(
    () => spareParts.filter((part) => matchesReceiveFilters(part, filters)),
    [filters, spareParts],
  );
  const filteredStores = filters.storeId === "ALL"
    ? stores
    : stores.filter((store) => store.id === filters.storeId);

  function addLine() {
    setLines((current) => [...current, {
      id: Math.max(...current.map((line) => line.id)) + 1,
      storeId: filters.storeId === "ALL" ? "" : filters.storeId,
      sparePartId: "",
    }]);
  }

  function removeLine(id: number) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  }

  return (
    <form action={action} className="space-y-5">
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="plantId" type="hidden" value={plantId} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className={labelClass}>
          วันที่รับเข้า
          <input
            className={inputClass}
            defaultValue={toLocalDateTimeInput(new Date())}
            name="receivedAt"
            required
            type="datetime-local"
          />
        </label>
        <label className={labelClass}>
          เลขที่เอกสารอ้างอิง
          <input className={inputClass} name="referenceNo" />
        </label>
        <label className={labelClass}>
          ผู้ขาย / Supplier
          <input className={inputClass} name="supplierName" />
        </label>
        <label className={labelClass}>
          หมายเหตุ
          <input className={inputClass} name="note" />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold">รายการรับเข้า</h3>
            <p className="text-sm text-[var(--muted)]">เพิ่มหลายรายการได้ในเอกสารเดียว</p>
          </div>
          <button className={secondaryButtonClass} onClick={addLine} type="button">
            <Plus size={17} />
            เพิ่มรายการ
          </button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className={labelClass}>
            ค้นหาอะไหล่
            <span className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
              <input
                aria-label="ค้นหาอะไหล่สำหรับรับเข้า"
                className={`${inputClass} pl-10`}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="รหัส, Item code, ชื่ออะไหล่"
                value={filters.search}
              />
            </span>
          </label>
          <FilterSelect
            label="คลังอะไหล่"
            onChange={(storeId) => setFilters((current) => ({ ...current, storeId }))}
            options={stores.map((store) => ({ label: `${store.code} · ${store.name}`, value: store.id }))}
            value={filters.storeId}
          />
          <FilterSelect label="ประเภท" onChange={(type) => setFilters((current) => ({ ...current, type }))} options={filterOptions.types.map(toFilterOption)} value={filters.type} />
          <FilterSelect label="หมวดหมู่" onChange={(category) => setFilters((current) => ({ ...current, category }))} options={filterOptions.categories.map(toFilterOption)} value={filters.category} />
          <FilterSelect label="หน่วยนับ" onChange={(unit) => setFilters((current) => ({ ...current, unit }))} options={filterOptions.units.map(toFilterOption)} value={filters.unit} />
          <FilterSelect
            label="สถานะสต็อก"
            onChange={(stockStatus) => setFilters((current) => ({ ...current, stockStatus: stockStatus as StockStatus }))}
            options={[
              { label: "เพียงพอ", value: "ENOUGH" },
              { label: "ใกล้หมด", value: "LOW" },
              { label: "หมดสต็อก", value: "OUT" },
            ]}
            value={filters.stockStatus}
          />
          <button className={`${secondaryButtonClass} self-end justify-center sm:col-span-2 xl:col-span-3 xl:justify-self-start`} onClick={() => setFilters(initialFilters)} type="button">
            <FilterX size={17} /> ล้างตัวกรอง
          </button>
        </div>

        <p className="text-xs font-semibold text-[var(--muted)]">
          พบ {filteredSpareParts.length.toLocaleString("th-TH")} จาก {spareParts.length.toLocaleString("th-TH")} รายการ
        </p>

        {lines.map((line, index) => {
          const lineParts = includeSelectedPart(filteredSpareParts, spareParts, line.sparePartId);
          return (
          <div
            key={line.id}
            className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 lg:grid-cols-[minmax(160px,0.8fr)_minmax(240px,1.5fr)_110px_140px_auto]"
          >
            <label className={labelClass}>
              คลัง
              <select
                className={inputClass}
                name="storeId"
                onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, storeId: event.target.value } : item))}
                required
                value={line.storeId}
              >
                <option disabled value="">
                  เลือกคลัง
                </option>
                {filteredStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.code} · {store.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              อะไหล่
              <select
                className={inputClass}
                name="sparePartId"
                onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, sparePartId: event.target.value } : item))}
                required
                value={line.sparePartId}
              >
                <option disabled value="">
                  เลือกอะไหล่
                </option>
                {lineParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.code} · {part.itemCode || "-"} · {part.name} ({part.unit})
                  </option>
                ))}
                {!lineParts.length ? <option disabled value="">ไม่พบอะไหล่ตามตัวกรอง</option> : null}
              </select>
            </label>
            <label className={labelClass}>
              จำนวน
              <input className={inputClass} min="0.01" name="quantity" required step="0.01" type="number" />
            </label>
            <label className={labelClass}>
              ราคาต่อหน่วย
              <input className={inputClass} min="0" name="unitPrice" step="0.01" type="number" />
            </label>
            <button
              aria-label={`ลบรายการที่ ${index + 1}`}
              className="mt-auto flex size-12 items-center justify-center rounded-2xl border border-red-500/30 text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={lines.length === 1}
              onClick={() => removeLine(line.id)}
              title="ลบรายการ"
              type="button"
            >
              <Minus size={18} />
            </button>
          </div>
          );
        })}
      </div>

      {!canSubmit ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
          กรุณาสร้างคลังและข้อมูลอะไหล่ก่อนรับ Stock
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-lg backdrop-blur">
        <button
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--primary)] px-6 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canSubmit}
        >
          <PackagePlus size={19} />
          บันทึกรับเข้า Stock
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
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="ALL">ทั้งหมด</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function matchesReceiveFilters(part: SparePartOption, filters: ReceiveFilters) {
  const search = filters.search.trim().toLocaleLowerCase("th-TH");
  const haystack = [part.code, part.itemCode, part.name, part.typeName, part.categoryName, part.unit]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("th-TH");
  const relevantStocks = filters.storeId === "ALL"
    ? part.stocks
    : part.stocks.filter((stock) => stock.storeId === filters.storeId);
  const quantity = relevantStocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const status = quantity <= 0 ? "OUT" : quantity <= part.minStock ? "LOW" : "ENOUGH";

  return (
    (!search || haystack.includes(search)) &&
    (filters.storeId === "ALL" || relevantStocks.length > 0) &&
    (filters.type === "ALL" || part.typeName === filters.type) &&
    (filters.category === "ALL" || part.categoryName === filters.category) &&
    (filters.unit === "ALL" || part.unit === filters.unit) &&
    (filters.stockStatus === "ALL" || status === filters.stockStatus)
  );
}

function includeSelectedPart(filtered: SparePartOption[], all: SparePartOption[], selectedId: string) {
  if (!selectedId || filtered.some((part) => part.id === selectedId)) return filtered;
  const selected = all.find((part) => part.id === selectedId);
  return selected ? [selected, ...filtered] : filtered;
}

function toFilterOption(value: string) {
  return { label: value, value };
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "th"));
}

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]";
