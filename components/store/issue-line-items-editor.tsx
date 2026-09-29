"use client";

import { Beaker, Droplets, Minus, Package, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { SparePartBarcodeScanner } from "./spare-part-barcode-scanner";
import {
  filterStocks,
  IssueStockFilterPanel,
  SearchableStockSelect,
  stockForKey,
  type IssueLine,
  type StockFilters,
  type StockOption,
} from "./issue-stock-selector";

export type IssueZoneOption = { id: string; name: string; code: string };
export type IssueItemKind = "SPARE_PART" | "CHEMICAL" | "OIL";

export function IssueLineItemsEditor({
  filters,
  itemKind,
  issueZones,
  kindNoun,
  kindStocks,
  lines,
  onAddLine,
  onFiltersChange,
  onItemKindChange,
  onLineChange,
  onRemoveLine,
  onScannedStock,
  publicRequester,
  stocks,
}: {
  filters: StockFilters;
  itemKind: IssueItemKind;
  issueZones: IssueZoneOption[];
  kindNoun: string;
  kindStocks: StockOption[];
  lines: IssueLine[];
  onAddLine: () => void;
  onFiltersChange: (filters: StockFilters) => void;
  onItemKindChange: (itemKind: IssueItemKind) => void;
  onLineChange: (lineId: number, next: Partial<IssueLine>) => void;
  onRemoveLine: (lineId: number) => void;
  onScannedStock: (stockKey: string) => void;
  publicRequester: boolean;
  stocks: StockOption[];
}) {
  const filteredStocks = useMemo(
    () => filterStocks(kindStocks, filters),
    [filters, kindStocks],
  );

  return (
    <section className="overflow-visible">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
            เลือกประเภทและรายการ
          </p>
          <h3 className="mt-1 text-2xl font-black text-[var(--ink)]">
            รายการที่ต้องการเบิก
          </h3>
        </div>
        <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-extrabold text-[var(--primary)]">
          {lines.filter((line) => line.stockKey).length} รายการ
        </span>
      </div>

      <div className="border-b border-[var(--line)]">
        <div
          aria-label="ประเภทสิ่งของที่ต้องการเบิก"
          className="grid grid-cols-3"
          role="tablist"
        >
          {(
            [
              ["SPARE_PART", "อะไหล่", Package],
              ["CHEMICAL", "สารเคมี", Beaker],
              ["OIL", "น้ำมัน", Droplets],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              aria-selected={itemKind === value}
              className={
                "relative flex min-h-16 min-w-0 items-center justify-center gap-2 whitespace-nowrap px-2 text-sm font-extrabold transition-colors sm:px-4 sm:text-base " +
                (itemKind === value
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]")
              }
              key={value}
              onClick={() => onItemKindChange(value)}
              role="tab"
              type="button"
            >
              <Icon size={21} />
              {label}
              {itemKind === value ? (
                <span className="absolute inset-x-3 bottom-0 h-1 rounded-t-full bg-[var(--primary)]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <IssueStockFilterPanel
        filters={filters}
        onChange={onFiltersChange}
        stocks={kindStocks}
      />

      <div className="max-w-full pt-3">
        <div className="w-full overflow-visible rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {lines.map((line, index) => {
            const stock = stockForKey(stocks, line.stockKey);
            return (
              <article
                className="relative grid grid-cols-12 gap-x-2 gap-y-4 border-b border-[var(--line)] p-4 transition last:border-b-0 hover:bg-[var(--soft)]/60 sm:gap-x-3 sm:p-5"
                key={line.id}
              >
                <label className={labelClass + " col-span-12"}>
                  <span className="flex h-5 items-center gap-3 text-xs text-[var(--muted)]">
                    <strong className="text-base font-black leading-none text-[var(--primary)]">
                      {String(index + 1).padStart(2, "0")}
                    </strong>
                    {kindNoun} / คลัง
                  </span>
                  <SearchableStockSelect
                    line={line}
                    onChange={(next) => onLineChange(line.id, next)}
                    stocks={filteredStocks}
                  />
                  {stock ? (
                    <span className="truncate text-xs font-medium text-[var(--muted)]">
                      คงเหลือ {stock.available} {stock.unit} · {stock.storeName}
                    </span>
                  ) : null}
                </label>

                <label className={labelClass + " col-span-12 sm:col-span-5 sm:col-start-1"}>
                  <span className="text-xs text-[var(--muted)]">
                    Zone ที่นำไปใช้งาน
                  </span>
                  <select
                    className={inputClass}
                    disabled={!line.stockKey || !issueZones.length}
                    name="zoneId"
                    onChange={(event) =>
                      onLineChange(line.id, { zoneId: event.target.value })
                    }
                    required
                    value={line.zoneId}
                  >
                    <option value="">
                      {!line.stockKey
                        ? "เลือกอะไหล่ก่อน"
                        : issueZones.length
                          ? "เลือก Zone"
                          : "ไม่มี Applicable Zone"}
                    </option>
                    {issueZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.code} · {zone.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass + " col-span-9 sm:col-span-4"}>
                  <span className="text-xs text-[var(--muted)]">จำนวน</span>
                  <div className="grid grid-cols-[44px_minmax(44px,1fr)_44px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                    <button
                      aria-label="ลดจำนวน"
                      className="grid min-h-12 place-items-center text-[var(--primary)] hover:bg-[var(--soft)]"
                      onClick={() =>
                        onLineChange(line.id, {
                          requestedQty: String(
                            Math.max(1, Number(line.requestedQty || 1) - 1),
                          ),
                        })
                      }
                      type="button"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      className="min-w-0 border-x border-[var(--line)] bg-transparent px-2 text-center text-lg font-black outline-none"
                      inputMode="numeric"
                      max={stock?.available}
                      min="1"
                      name="requestedQty"
                      onChange={(event) =>
                        onLineChange(line.id, {
                          requestedQty: event.target.value,
                        })
                      }
                      required
                      step="1"
                      type="number"
                      value={line.requestedQty}
                    />
                    <button
                      aria-label="เพิ่มจำนวน"
                      className="grid min-h-12 place-items-center text-[var(--primary)] hover:bg-[var(--soft)]"
                      onClick={() =>
                        onLineChange(line.id, {
                          requestedQty: String(
                            Math.min(
                              stock?.available ?? Number.MAX_SAFE_INTEGER,
                              Number(line.requestedQty || 0) + 1,
                            ),
                          ),
                        })
                      }
                      type="button"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </label>

                <div className="col-span-3 flex items-end justify-end sm:col-span-1 sm:col-start-12 sm:row-start-2">
                  <button
                    aria-label={"ลบรายการที่ " + (index + 1)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5 text-red-600 transition hover:bg-red-500/10 disabled:opacity-30"
                    disabled={lines.length === 1}
                    onClick={() => onRemoveLine(line.id)}
                    type="button"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div
          className={
            "mt-3 grid grid-cols-[minmax(0,1.35fr)_minmax(0,.85fr)] gap-2 " +
            (publicRequester ? "" : "grid-cols-1")
          }
        >
          <button
            className={
              secondaryButtonClass +
              " min-h-14 justify-center border-dashed border-[var(--primary)]/60 text-[var(--primary)]"
            }
            onClick={onAddLine}
            type="button"
          >
            <Plus size={17} /> เพิ่มรายการ
          </button>
          {publicRequester ? (
            <SparePartBarcodeScanner
              onSelect={onScannedStock}
              options={stocks.map((stock) => ({
                stockKey: stock.storeId + ":" + stock.sparePartId,
                itemCode: stock.itemCode,
                sparePartCode: stock.sparePartCode,
                sparePartName: stock.sparePartName,
              }))}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]";
