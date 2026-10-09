"use client";

import { ChevronDown, ChevronRight, CircleDot, Globe2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type PmCheckSheetTreeItem = {
  id: string;
  code: string;
  name: string;
  level: string;
  assetType: string;
  href: string;
  children: PmCheckSheetTreeItem[];
};

export type PmCheckSheetTreeSystem = {
  id: string;
  code: string;
  name: string;
  branches: PmCheckSheetTreeItem[];
};

export function PmCheckSheetTree({
  systems,
  review,
  selectedAssetId,
}: {
  systems: PmCheckSheetTreeSystem[];
  review: PmCheckSheetTreeItem[];
  selectedAssetId?: string;
}) {
  const expandable = useMemo(() => {
    const keys: string[] = systems.map((system) => `system:${system.id}`);
    const visit = (item: PmCheckSheetTreeItem) => {
      if (item.children.length) keys.push(`asset:${item.id}`);
      item.children.forEach(visit);
    };
    systems.forEach((system) => system.branches.forEach(visit));
    review.forEach(visit);
    return keys;
  }, [review, systems]);
  const selectedPath = useMemo(() => {
    const keys = new Set<string>();
    if (!selectedAssetId) return keys;
    const visit = (item: PmCheckSheetTreeItem): boolean => {
      const selected = item.id === selectedAssetId || item.children.some(visit);
      if (selected && item.children.length) keys.add(`asset:${item.id}`);
      return selected;
    };
    for (const system of systems) {
      if (system.branches.some(visit)) keys.add(`system:${system.id}`);
    }
    review.some(visit);
    return keys;
  }, [review, selectedAssetId, systems]);
  const [expanded, setExpanded] = useState<Set<string>>(() => selectedPath);
  useEffect(() => {
    if (!selectedPath.size) return;
    setExpanded((current) => new Set([...current, ...selectedPath]));
  }, [selectedPath]);
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Assets Tree สำหรับ PM Check Sheet">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-900">Assets Tree</p>
          <p className="text-xs text-slate-500">เลือก Asset เพื่อกำหนดแบบฟอร์ม PM</p>
        </div>
        <div className="flex gap-2">
          <button className={treeButton} onClick={() => setExpanded(new Set(expandable))} type="button"><PanelLeftOpen size={15}/>ขยาย</button>
          <button className={treeButton} onClick={() => setExpanded(new Set())} type="button"><PanelLeftClose size={15}/>ย่อ</button>
        </div>
      </div>
      <div className="max-h-[calc(100vh-15rem)] overflow-auto p-2" role="tree">
        {systems.map((system) => {
          const key = `system:${system.id}`;
          const open = expanded.has(key);
          return <div className="mb-1" key={system.id}>
            <button aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left font-bold text-violet-900 hover:bg-violet-50" onClick={() => toggle(key)} type="button">
              {open ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}<Globe2 className="text-violet-500" size={16}/><span className="truncate">{system.code} · {system.name}</span>
            </button>
            {open ? <TreeItems items={system.branches} expanded={expanded} onToggle={toggle} selectedAssetId={selectedAssetId} depth={1}/> : null}
          </div>;
        })}
        {review.length ? <div className="mt-2 border-t border-amber-200 pt-2"><p className="px-3 py-2 text-xs font-black text-amber-700">รอตรวจสอบโครงสร้าง</p><TreeItems items={review} expanded={expanded} onToggle={toggle} selectedAssetId={selectedAssetId} depth={0}/></div> : null}
        {!systems.length && !review.length ? <p className="p-8 text-center text-sm text-slate-500">ยังไม่พบ Asset</p> : null}
      </div>
    </section>
  );
}

function TreeItems({ items, expanded, onToggle, selectedAssetId, depth }: { items: PmCheckSheetTreeItem[]; expanded: Set<string>; onToggle: (key: string) => void; selectedAssetId?: string; depth: number }) {
  return <>{items.map((item) => {
    const key = `asset:${item.id}`;
    const open = expanded.has(key);
    const selected = selectedAssetId === item.id;
    return <div key={item.id} role="treeitem" aria-selected={selected}>
      <div className={`flex min-h-12 items-center rounded-xl pr-2 ${selected ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-slate-50"}`} style={{ paddingLeft: `${depth * 18 + 4}px` }}>
        {item.children.length ? <button aria-label={`${open ? "ย่อ" : "ขยาย"} ${item.code}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white" onClick={() => onToggle(key)} type="button">{open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button> : <span className="size-8 shrink-0"/>}
        <CircleDot className={selected ? "text-emerald-600" : "text-slate-400"} size={15}/>
        <Link className="ml-2 min-w-0 flex-1 py-2 focus-visible:outline-none" href={item.href} scroll={false}>
          <span className="block truncate text-sm font-bold text-slate-900">{item.code} · {item.name}</span>
          <span className="block truncate text-[11px] text-slate-500">{item.level}{item.assetType ? ` · ${item.assetType}` : ""}</span>
        </Link>
      </div>
      {item.children.length && open ? <TreeItems items={item.children} expanded={expanded} onToggle={onToggle} selectedAssetId={selectedAssetId} depth={depth + 1}/> : null}
    </div>;
  })}</>;
}

const treeButton = "inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 hover:border-slate-400 hover:text-slate-900";
