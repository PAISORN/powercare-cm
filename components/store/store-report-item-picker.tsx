"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type ReportItem = {
  id: string;
  code: string;
  itemCode: string | null;
  itemKind: string;
  name: string;
};

export function StoreReportItemPicker({ items }: { items: ReportItem[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const normalizedSearch = search.trim().toLocaleLowerCase("th-TH");
  const visibleItems = useMemo(() => {
    if (!normalizedSearch) return items;
    return items.filter((item) =>
      [item.code, item.itemCode, item.name, itemKindLabel(item.itemKind)]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("th-TH").includes(normalizedSearch)),
    );
  }, [items, normalizedSearch]);

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
    <fieldset className="grid gap-2 sm:col-span-2 xl:col-span-4">
      <legend className="text-sm font-bold">เลือกรายการสำหรับรายงานเบิกแยกตามวันที่</legend>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
            <span className="sr-only">ค้นหารายการ</span>
            <input
              className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหารหัส Item Code ชื่อ หรือประเภท"
              type="search"
              value={search}
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
          <span>แสดง {visibleItems.length} จาก {items.length} รายการ</span>
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
          {!visibleItems.length ? <p className="p-5 text-center text-sm text-[var(--muted)]">ไม่พบรายการที่ค้นหา</p> : null}
        </div>
      </div>
      <p className="text-xs font-medium leading-5 text-[var(--muted)]">ติ๊กเลือกได้หลายรายการ หากไม่เลือกรายการ ระบบจะใช้ “ประเภทรายการ” ด้านบน</p>
    </fieldset>
  );
}

function itemKindLabel(value: string) {
  if (value === "CHEMICAL") return "สารเคมี";
  if (value === "OIL") return "น้ำมัน";
  if (value === "FUEL") return "เชื้อเพลิง";
  return "อะไหล่";
}
