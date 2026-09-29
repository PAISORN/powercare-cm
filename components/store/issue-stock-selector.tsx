"use client";

import { FilterX, Package, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type StockStatus = "ENOUGH" | "LOW" | "OUT";

export type StockOption = {
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

export type IssueLine = {
  id: number;
  stockKey: string;
  stockSearch: string;
  zoneId: string;
  requestedQty: string;
};

export type StockFilters = {
  store: string;
  type: string;
  category: string;
  materialGroup: string;
  unit: string;
  stockStatus: string;
};

export const initialStockFilters: StockFilters = {
  store: "ALL",
  type: "ALL",
  category: "ALL",
  materialGroup: "ALL",
  unit: "ALL",
  stockStatus: "ALL",
};

export function IssueStockFilterPanel({
  filters,
  onChange,
  stocks,
}: {
  filters: StockFilters;
  onChange: (filters: StockFilters) => void;
  stocks: StockOption[];
}) {
  const options = useMemo(() => buildFilterOptions(stocks), [stocks]);
  const materialGroups = useMemo(
    () =>
      uniqueSorted(
        stocks
          .filter((stock) => stock.sparePartCategoryName === filters.category)
          .map((stock) => stock.sparePartMaterialGroupName ?? ""),
      ),
    [filters.category, stocks],
  );

  return (
    <details className="group mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--soft)]/65 shadow-[var(--shadow)]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-extrabold text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <FilterX size={17} /> ตัวกรองเพิ่มเติม
        </span>
        <span className="text-[var(--primary)] group-open:hidden">เปิด</span>
        <span className="hidden text-[var(--primary)] group-open:inline">
          ปิด
        </span>
      </summary>
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 2xl:grid-cols-3">
        <FilterSelect
          label="คลังอะไหล่"
          onChange={(value) => onChange({ ...filters, store: value })}
          options={options.stores}
          value={filters.store}
        />
        <FilterSelect
          label="ประเภท"
          onChange={(value) => onChange({ ...filters, type: value })}
          options={options.types}
          value={filters.type}
        />
        <FilterSelect
          label="หมวดหมู่"
          onChange={(value) =>
            onChange({ ...filters, category: value, materialGroup: "ALL" })
          }
          options={options.categories}
          value={filters.category}
        />
        <FilterSelect
          disabled={filters.category === "ALL"}
          label="กลุ่มอะไหล่/วัสดุ"
          onChange={(value) => onChange({ ...filters, materialGroup: value })}
          options={materialGroups}
          value={filters.materialGroup}
        />
        <FilterSelect
          label="หน่วยนับ"
          onChange={(value) => onChange({ ...filters, unit: value })}
          options={options.units}
          value={filters.unit}
        />
        <FilterSelect
          label="สถานะสต๊อก"
          onChange={(value) => onChange({ ...filters, stockStatus: value })}
          options={options.stockStatuses}
          value={filters.stockStatus}
        />
        <button
          className={secondaryButtonClass + " self-end"}
          onClick={() => onChange(initialStockFilters)}
          type="button"
        >
          <FilterX size={17} /> ล้างตัวกรอง
        </button>
      </div>
    </details>
  );
}

export function SearchableStockSelect({
  line,
  onChange,
  stocks,
}: {
  line: IssueLine;
  onChange: (next: Partial<IssueLine>) => void;
  stocks: StockOption[];
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 288,
  });
  const options = useMemo(
    () =>
      stocks
        .filter((stock) => matchesStockSearch(stock, line.stockSearch))
        .slice(0, 50),
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
      const availableHeight = Math.max(
        120,
        Math.min(288, placeAbove ? spaceAbove : spaceBelow),
      );

      setMenuPosition({
        left: rect.left,
        top: placeAbove
          ? Math.max(8, rect.top - availableHeight - 4)
          : rect.bottom + 4,
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
      stockKey: stock.storeId + ":" + stock.sparePartId,
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
          onClick={() =>
            onChange({ stockKey: "", stockSearch: "", zoneId: "" })
          }
          type="button"
        >
          <span className="block truncate font-extrabold text-[var(--ink)]">
            {selectedStock.sparePartName ?? selectedStock.label}
          </span>
          <span className="mt-1 block truncate text-xs font-semibold text-[var(--muted)]">
            {selectedStock.sparePartCode ?? selectedStock.itemCode ?? "-"}
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--soft)] px-2 py-1 text-xs font-bold text-[var(--muted)]">
            <Package size={14} />
            {selectedStock.storeCode ?? selectedStock.storeName ?? "-"}
          </span>
        </button>
      ) : (
        <Search
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]"
          size={17}
        />
      )}
      <input
        aria-activedescendant={
          activeIndex >= 0
            ? "stock-option-" + line.id + "-" + activeIndex
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={"stock-options-" + line.id}
        aria-expanded={open}
        aria-label={"ค้นหาและเลือกอะไหล่ รายการ " + line.id}
        aria-haspopup="listbox"
        autoComplete="off"
        className={line.stockKey ? "sr-only" : inputClass + " pl-10"}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange({
            stockKey: "",
            stockSearch: event.target.value,
            zoneId: "",
          });
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
              if (event.key === "ArrowDown")
                return current >= options.length - 1 ? 0 : current + 1;
              return current <= 0 ? options.length - 1 : current - 1;
            });
            return;
          }
          if (
            event.key === "Enter" &&
            open &&
            activeIndex >= 0 &&
            options[activeIndex]
          ) {
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
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[200] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-2xl"
              id={"stock-options-" + line.id}
              role="listbox"
              style={{
                left: menuPosition.left,
                top: menuPosition.top,
                width: menuPosition.width,
                maxHeight: menuPosition.maxHeight,
              }}
            >
              {options.length ? (
                options.map((stock, index) => {
                  const stockKey = stock.storeId + ":" + stock.sparePartId;
                  const codes =
                    [stock.sparePartCode, stock.itemCode]
                      .filter(Boolean)
                      .join(" · ") || "-";
                  return (
                    <button
                      aria-selected={line.stockKey === stockKey}
                      className={
                        "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--soft)] " +
                        (activeIndex === index ? "bg-[var(--soft)]" : "")
                      }
                      id={"stock-option-" + line.id + "-" + index}
                      key={stockKey}
                      onClick={() => selectStock(stock)}
                      onMouseDown={(event) => event.preventDefault()}
                      role="option"
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {stock.sparePartName ?? stock.label}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {codes} · {stock.storeName ?? "-"}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {stock.sparePartTypeName ?? "-"} ·{" "}
                          {stock.sparePartCategoryName ?? "-"}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-[var(--primary)]">
                        {stock.available} {stock.unit}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                  ไม่พบอะไหล่
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function filterStocks(stocks: StockOption[], filters: StockFilters) {
  return stocks.filter((stock) => matchesStockFilters(stock, filters));
}

export function stockForKey(stocks: StockOption[], stockKey: string) {
  return stocks.find(
    (stock) => stock.storeId + ":" + stock.sparePartId === stockKey,
  );
}

export function stockDisplayLabel(stock: StockOption) {
  return (
    (stock.sparePartName ?? stock.label) +
    " · " +
    (stock.sparePartCode ?? stock.itemCode ?? "-")
  );
}

function matchesStockSearch(stock: StockOption, value: string) {
  const search = value.trim().toLowerCase();
  if (!search) return true;
  return [
    stock.label,
    stock.sparePartName,
    stock.sparePartCode,
    stock.itemCode,
    stock.storeName,
    stock.sparePartTypeName,
    stock.sparePartCategoryName,
  ]
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
      <select
        aria-label={label}
        className={inputClass}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
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
    stores: uniqueSorted(
      stocks.map((stock) => stock.storeName ?? stock.storeCode ?? ""),
    ),
    types: uniqueSorted(stocks.map((stock) => stock.sparePartTypeName ?? "")),
    categories: uniqueSorted(
      stocks.map((stock) => stock.sparePartCategoryName ?? ""),
    ),
    units: uniqueSorted(stocks.map((stock) => stock.unit)),
    stockStatuses: ["ENOUGH", "LOW", "OUT"],
  };
}

function matchesStockFilters(stock: StockOption, filters: StockFilters) {
  return (
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
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]";
