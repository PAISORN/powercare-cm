"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Box, Boxes, ChevronDown, ChevronRight, ExternalLink, Network, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export type AssetTreeItem = {
  id: string;
  code: string;
  name: string;
  levelLabel: string;
  statusLabel: string;
  criticalityLabel: string;
  contextOnly: boolean;
  imageUrl: string | null;
  detailHref: string;
  details: { label: string; value: string }[];
  children: AssetTreeItem[];
};

export type AssetTreeSystem = {
  id: string;
  code: string;
  name: string;
  branches: AssetTreeItem[];
};

export function AssetTreeWorkspace({ siteCode, systems, review }: { siteCode: string; systems: AssetTreeSystem[]; review: AssetTreeItem[] }) {
  const allItems = useMemo(() => [...systems.flatMap(system => flatten(system.branches)), ...review], [systems, review]);
  const expandableIds = useMemo(() => new Set([
    ...systems.map(system => systemKey(system.id)),
    ...allItems.filter(item => item.children.length).map(item => assetKey(item.id)),
  ]), [systems, allItems]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(expandableIds));
  const [selectedId, setSelectedId] = useState(() => allItems.find(item => !item.contextOnly)?.id || allItems[0]?.id || "");
  const selected = allItems.find(item => item.id === selectedId) || allItems[0];

  function toggle(key: string) {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return <section aria-label="Tree Assets" className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
    <div className="grid min-h-[640px] xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="border-b border-[var(--line)] bg-[var(--soft)] xl:border-b-0 xl:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-600">Asset hierarchy</p>
            <h2 className="truncate font-black">Site {siteCode}</h2>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300">{allItems.length}</span>
        </div>
        <div className="flex gap-2 border-b border-[var(--line)] px-3 py-2">
          <button className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-bold transition hover:border-emerald-500 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={() => setExpanded(new Set(expandableIds))} type="button"><PanelLeftOpen size={16}/>ขยายทั้งหมด</button>
          <button className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-bold transition hover:border-emerald-500 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={() => setExpanded(new Set())} type="button"><PanelLeftClose size={16}/>ย่อทั้งหมด</button>
        </div>
        <div className="max-h-[680px] overflow-y-auto p-3">
          {systems.map(system => {
            const key = systemKey(system.id);
            const open = expanded.has(key);
            return <section className="mb-2 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]" key={system.id}>
              <button aria-label={`System ${system.name}`} aria-expanded={open} className="flex min-h-12 w-full cursor-pointer items-center gap-2 px-3 text-left transition hover:bg-[var(--soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-600" onClick={() => toggle(key)} type="button">
                {open ? <ChevronDown aria-hidden="true" className="shrink-0" size={17}/> : <ChevronRight aria-hidden="true" className="shrink-0" size={17}/>}<Network aria-hidden="true" className="shrink-0 text-emerald-600" size={18}/>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{system.name}</span><span className="block truncate font-mono text-[11px] text-[var(--muted)]">SYSTEM · {system.code}</span></span>
                <span className="text-xs font-bold text-[var(--muted)]">{countItems(system.branches)}</span>
              </button>
              {open ? <div className="border-t border-[var(--line)] px-2 py-2"><TreeBranches branches={system.branches} expanded={expanded} selectedId={selected?.id || ""} onSelect={setSelectedId} onToggle={toggle}/></div> : null}
            </section>;
          })}
          {review.length ? <section className="mt-3 overflow-hidden rounded-xl border border-amber-500/40 bg-[var(--surface)]">
            <div className="px-3 py-3"><p className="font-black text-amber-700 dark:text-amber-300">รอตรวจสอบโครงสร้าง</p><p className="mt-1 text-xs text-[var(--muted)]">{review.length} รายการ</p></div>
            <div className="border-t border-amber-500/20 px-2 py-2"><TreeBranches branches={review} expanded={expanded} selectedId={selected?.id || ""} onSelect={setSelectedId} onToggle={toggle}/></div>
          </section> : null}
        </div>
      </aside>

      {selected ? <div className="min-w-0 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="min-w-0"><p className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">{selected.code}</p><h2 className="mt-1 break-words text-xl font-black sm:text-2xl">{selected.name}</h2><div className="mt-3 flex flex-wrap gap-2"><Badge>{selected.levelLabel}</Badge><Badge>{selected.statusLabel}</Badge><Badge>{selected.criticalityLabel}</Badge></div></div>
          <Link className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" href={selected.detailHref}>เปิดรายละเอียด<ExternalLink size={16}/></Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.72fr)_minmax(360px,1.45fr)]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
            <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              {selected.imageUrl ? <img alt={`รูป ${selected.name}`} className="aspect-[4/3] w-full object-cover" loading="lazy" src={selected.imageUrl}/> : <div className="grid aspect-[4/3] place-items-center text-[var(--muted)]"><div className="text-center"><Boxes className="mx-auto" size={38}/><p className="mt-2 text-sm font-bold">ยังไม่มีรูป Asset</p></div></div>}
            </div>
            <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Selected asset</p><p className="mt-1 break-all font-mono text-lg font-black text-emerald-700 dark:text-emerald-300">{selected.code}</p>{selected.contextOnly ? <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">แสดงเป็นลำดับแม่ของผลการค้นหา</p> : null}</div>
          </div>
          <section className="min-w-0 rounded-2xl border border-[var(--line)]">
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3"><Box className="text-emerald-600" size={19}/><h3 className="font-black">ข้อมูลตาม Asset R8</h3></div>
            <dl className="px-4">{selected.details.map(item => <div className="grid grid-cols-[minmax(110px,0.85fr)_minmax(0,1.35fr)] border-b border-[var(--line)] py-2.5 text-sm last:border-b-0 sm:grid-cols-[minmax(150px,0.8fr)_minmax(0,1.4fr)]" key={item.label}><dt className="pr-3 text-xs font-bold text-[var(--muted)] sm:text-sm">{item.label}</dt><dd className="break-words border-l border-[var(--line)] pl-3 font-bold">{item.value || "ยังไม่ระบุ"}</dd></div>)}</dl>
          </section>
        </div>
      </div> : <div className="grid min-h-80 place-items-center p-6 text-center text-[var(--muted)]"><div><Boxes className="mx-auto" size={36}/><h2 className="mt-3 font-black text-[var(--ink)]">ยังไม่พบ Asset</h2><p className="mt-1 text-sm">ลองเปลี่ยนตัวกรองเพื่อแสดงโครงสร้าง</p></div></div>}
    </div>
  </section>;
}

function TreeBranches({ branches, expanded, selectedId, onSelect, onToggle }: { branches: AssetTreeItem[]; expanded: Set<string>; selectedId: string; onSelect: (id: string) => void; onToggle: (key: string) => void }) {
  return <ul className="space-y-0.5">{branches.map(branch => {
    const key = assetKey(branch.id);
    const open = expanded.has(key);
    const selected = selectedId === branch.id;
    return <li key={branch.id}>
      <div className={`flex min-h-12 items-stretch rounded-lg transition ${selected ? "bg-emerald-500/10 text-emerald-800 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-200" : "hover:bg-[var(--soft)]"}`}>
        {branch.children.length ? <button aria-label={`${open ? "ย่อ" : "ขยาย"} ${branch.code}`} aria-expanded={open} className="grid min-h-11 w-9 shrink-0 cursor-pointer place-items-center rounded-l-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-600" onClick={() => onToggle(key)} type="button">{open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button> : <span aria-hidden="true" className="w-9 shrink-0"/>}
        <button aria-label={`${branch.code} ${branch.name}`} aria-pressed={selected} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-r-lg py-1.5 pr-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-600" onClick={() => onSelect(branch.id)} type="button">
          <Boxes aria-hidden="true" className={`shrink-0 ${branch.levelLabel === "Main Asset" ? "text-emerald-600" : "text-[var(--muted)]"}`} size={16}/><span className="min-w-0"><span className="block truncate font-mono text-xs font-black">{branch.code}</span><span className="block truncate text-xs text-[var(--muted)]">{branch.name}</span></span>
        </button>
      </div>
      {branch.children.length && open ? <div className="relative ml-[17px] border-l border-[var(--line)] pl-3 before:absolute before:left-0 before:top-0 before:w-3 before:border-t before:border-[var(--line)]"><TreeBranches branches={branch.children} expanded={expanded} selectedId={selectedId} onSelect={onSelect} onToggle={onToggle}/></div> : null}
    </li>;
  })}</ul>;
}

function Badge({ children }: { children: string }) { return <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-bold">{children}</span>; }
function flatten(items: AssetTreeItem[]): AssetTreeItem[] { return items.flatMap(item => [item, ...flatten(item.children)]); }
function countItems(items: AssetTreeItem[]) { return flatten(items).length; }
function systemKey(id: string) { return `system:${id}`; }
function assetKey(id: string) { return `asset:${id}`; }
