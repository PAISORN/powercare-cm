"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ReportItem = {
  id: string;
  code: string;
  itemCode: string | null;
  itemKind: string;
  name: string;
  typeId: string | null;
  categoryId: string | null;
  materialGroupId: string | null;
  unit: string;
  minStock: number;
  stocks: Array<{ storeId: string; quantity: number }>;
};

type Option = { id: string; code: string; name: string };
type CategoryOption = { id: string; code: string | null; name: string };
type MaterialGroupOption = { id: string; categoryId: string; code: string; name: string };

type Filters = {
  itemKind: string;
  search: string;
  storeId: string;
  typeId: string;
  categoryId: string;
  materialGroupId: string;
  unit: string;
  stockStatus: string;
};

const initialFilters: Filters = {
  itemKind: "ALL",
  search: "",
  storeId: "",
  typeId: "",
  categoryId: "",
  materialGroupId: "",
  unit: "",
  stockStatus: "all",
};

export function StoreReportItemPicker({
  items,
  stores,
  types,
  categories,
  materialGroups,
  units,
}: {
  items: ReportItem[];
  stores: Option[];
  types: Option[];
  categories: CategoryOption[];
  materialGroups: MaterialGroupOption[];
  units: string[];
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const visibleMaterialGroups = useMemo(
    () => materialGroups.filter((group) => group.categoryId === filters.categoryId),
    [filters.categoryId, materialGroups],
  );
  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilters(item, filters)),
    [filters, items],
  );
  const normalizedPickerSearch = pickerSearch.trim().toLocaleLowerCase("th-TH");
  const visibleItems = useMemo(() => {
    if (!normalizedPickerSearch) return filteredItems;
    return filteredItems.filter((item) =>
      [item.code, item.itemCode, item.name, itemKindLabel(item.itemKind)]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("th-TH").includes(normalizedPickerSearch)),
    );
  }, [filteredItems, normalizedPickerSearch]);

  useEffect(() => {
    const allowedIds = new Set(filteredItems.map((item) => item.id));
    setSelected((current) => {
      const next = new Set([...current].filter((itemId) => allowedIds.has(itemId)));
      return next.size === current.size ? current : next;
    });
  }, [filteredItems]);

  function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "categoryId" ? { materialGroupId: "" } : {}),
    }));
  }

  function toggleItem(itemId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function selectVisible() {
    setSelected((current) => new Set([...current, ...visibleItems.map((item) => item.id)]));
  }

  return (
    <>
      <label className={`${labelClass} content-start self-start`}>
        ประเภทรายงาน
        <select className={inputClass} defaultValue="ISSUE_BY_DATE" name="reportType">
          <option value="ISSUE_BY_DATE">รายการเบิกแยกตามวันที่</option>
          <option value="STOCK_BALANCE">Stock Balance</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="MOVEMENTS">Stock Movement</option>
          <option value="ISSUES">ใบเบิก Stock</option>
        </select>
        <span className="text-xs font-medium leading-5 text-[var(--muted)]">ค่าเริ่มต้นจะแสดงจำนวนเบิกแยกเป็นคอลัมน์ตามวันที่ที่เลือก</span>
      </label>
      <label className={`${labelClass} content-start self-start`}>
        ชนิดรายการ
        <select className={inputClass} name="itemKind" onChange={(event) => updateFilter("itemKind", event.target.value)} value={filters.itemKind}>
          <option value="ALL">ทั้งหมด</option>
          <option value="SPARE_PART">อะไหล่</option>
          <option value="CHEMICAL">สารเคมี</option>
          <option value="OIL">น้ำมัน</option>
          <option value="FUEL">เชื้อเพลิง</option>
        </select>
      </label>

      <div className="col-span-full mt-2 border-t border-[var(--line)] pt-4">
        <h3 className="font-extrabold text-[var(--ink)]">Filter ข้อมูลก่อน Export</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">รายการด้านล่างจะเปลี่ยนทันทีตาม Filter และไฟล์ที่ดาวน์โหลดจะใช้เงื่อนไขเดียวกัน</p>
      </div>
      <label className={labelClass}>
        ค้นหา
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
          <input
            autoComplete="off"
            className={`${inputClass} pl-10`}
            name="search"
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="ค้นหา รหัสอะไหล่, รายการอะไหล่, Part No."
            value={filters.search}
          />
        </span>
      </label>
      <FilterSelect label="คลังอะไหล่" name="storeId" onChange={(value) => updateFilter("storeId", value)} value={filters.storeId}>
        <option value="">ทั้งหมด</option>
        {stores.map((store) => <option key={store.id} value={store.id}>{store.code} · {store.name}</option>)}
      </FilterSelect>
      <FilterSelect label="ประเภท" name="typeId" onChange={(value) => updateFilter("typeId", value)} value={filters.typeId}>
        <option value="">ทั้งหมด</option>
        {types.map((type) => <option key={type.id} value={type.id}>{type.code} · {type.name}</option>)}
      </FilterSelect>
      <FilterSelect label="หมวดหมู่" name="categoryId" onChange={(value) => updateFilter("categoryId", value)} value={filters.categoryId}>
        <option value="">ทั้งหมด</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.code ? `${category.code} · ` : ""}{category.name}</option>)}
      </FilterSelect>
      <FilterSelect disabled={!filters.categoryId} label="กลุ่มอะไหล่/วัสดุ" name="materialGroupId" onChange={(value) => updateFilter("materialGroupId", value)} value={filters.materialGroupId}>
        <option value="">{filters.categoryId ? "ทั้งหมด" : "เลือกหมวดหมู่ก่อน"}</option>
        {visibleMaterialGroups.map((group) => <option key={group.id} value={group.id}>{group.code} · {group.name}</option>)}
      </FilterSelect>
      <FilterSelect label="หน่วยนับ" name="unit" onChange={(value) => updateFilter("unit", value)} value={filters.unit}>
        <option value="">ทั้งหมด</option>
        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </FilterSelect>
      <FilterSelect label="สถานะสต็อก" name="stockStatus" onChange={(value) => updateFilter("stockStatus", value)} value={filters.stockStatus}>
        <option value="all">ทั้งหมด</option>
        <option value="available">เพียงพอ</option>
        <option value="nearMin">ใกล้หมด</option>
        <option value="outOfStock">หมดสต็อก</option>
      </FilterSelect>

      <fieldset className="grid gap-2 sm:col-span-2 xl:col-span-4">
        <legend className="text-sm font-bold">เลือกรายการสำหรับรายงานเบิกแยกตามวันที่</legend>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
              <span className="sr-only">ค้นหารายการ</span>
              <input
                className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                onChange={(event) => setPickerSearch(event.target.value)}
                placeholder="ค้นหาในผลลัพธ์ Filter"
                type="search"
                value={pickerSearch}
              />
            </label>
            <button className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold text-[var(--primary)]" onClick={selectVisible} type="button">
              เลือกผลค้นหาทั้งหมด
            </button>
            <button className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold text-[var(--muted)]" onClick={() => setSelected(new Set())} type="button">
              ล้างที่เลือก
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
            <span>เลือกแล้ว {selected.size} รายการ</span>
            <span>แสดง {visibleItems.length} จาก {filteredItems.length} รายการ</span>
          </div>

          <div aria-label="รายการที่เลือกส่งออกรายงาน" className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-[var(--line)]" role="group">
            {visibleItems.map((item) => {
              const checked = selected.has(item.id);
              return (
                <label className={`flex cursor-pointer items-start gap-3 border-b border-[var(--line)] px-3 py-2.5 last:border-b-0 ${checked ? "bg-emerald-500/10" : "hover:bg-[var(--soft)]"}`} key={item.id}>
                  <input
                    checked={checked}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                    name="itemIds"
                    onChange={() => toggleItem(item.id)}
                    type="checkbox"
                    value={item.id}
                  />
                  <span className="min-w-0">
                    <span className="block break-words font-mono text-xs font-bold text-[var(--primary)]">{item.itemCode || item.code}</span>
                    <span className="mt-0.5 block text-sm font-semibold text-[var(--ink)]">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.code} · {itemKindLabel(item.itemKind)}</span>
                  </span>
                </label>
              );
            })}
            {!visibleItems.length ? <p className="p-5 text-center text-sm text-[var(--muted)]">ไม่พบรายการตาม Filter</p> : null}
          </div>
        </div>
        <p className="text-xs font-medium leading-5 text-[var(--muted)]">ติ๊กเลือกได้หลายรายการ หากไม่เลือกรายการ ระบบจะใช้ผลลัพธ์จาก Filter ทั้งหมด</p>
      </fieldset>
    </>
  );
}

function FilterSelect({ label, name, value, onChange, disabled = false, children }: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      <select className={inputClass} disabled={disabled} name={name} onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function matchesFilters(item: ReportItem, filters: Filters) {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase("th-TH");
  if (filters.itemKind !== "ALL" && item.itemKind !== filters.itemKind) return false;
  if (filters.typeId && item.typeId !== filters.typeId) return false;
  if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
  if (filters.materialGroupId && item.materialGroupId !== filters.materialGroupId) return false;
  if (filters.unit && item.unit !== filters.unit) return false;
  if (normalizedSearch && ![item.code, item.itemCode, item.name, itemKindLabel(item.itemKind)]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase("th-TH").includes(normalizedSearch))) return false;

  const relevantStocks = filters.storeId
    ? item.stocks.filter((stock) => stock.storeId === filters.storeId)
    : item.stocks;
  if (filters.storeId && relevantStocks.length === 0) return false;
  if (filters.stockStatus === "all") return true;
  return relevantStocks.some((stock) => {
    if (filters.stockStatus === "available") return stock.quantity > item.minStock;
    if (filters.stockStatus === "nearMin") return stock.quantity > 0 && stock.quantity <= item.minStock;
    if (filters.stockStatus === "outOfStock") return stock.quantity <= 0;
    return true;
  });
}

function itemKindLabel(value: string) {
  if (value === "CHEMICAL") return "สารเคมี";
  if (value === "OIL") return "น้ำมัน";
  if (value === "FUEL") return "เชื้อเพลิง";
  return "อะไหล่";
}

const inputClass = "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "grid gap-1.5 text-sm font-bold";