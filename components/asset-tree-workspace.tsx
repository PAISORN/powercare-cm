"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CircleDot, Globe2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export type AssetTreeItem = {
  id: string;
  code: string;
  name: string;
  levelLabel: string;
  areaZone: string;
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

const tableGrid = "grid min-w-[860px] grid-cols-[minmax(390px,2.35fr)_minmax(180px,1fr)_minmax(150px,0.78fr)_minmax(180px,1fr)]";
const treeLine = "border-slate-300";

export function AssetTreeWorkspace({ siteCode, systems, review }: { siteCode: string; systems: AssetTreeSystem[]; review: AssetTreeItem[] }) {
  const allItems = useMemo(() => [...systems.flatMap(system => flatten(system.branches)), ...review], [systems, review]);
  const expandableIds = useMemo(() => new Set([
    ...systems.map(system => systemKey(system.id)),
    ...allItems.filter(item => item.children.length).map(item => assetKey(item.id)),
  ]), [systems, allItems]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return <section aria-label="Tree Assets" className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm" style={{ colorScheme: "light" }}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <p className="text-xs font-semibold text-slate-500">Site {siteCode} · {allItems.length} รายการ</p>
      <div className="flex gap-2" role="toolbar" aria-label="ควบคุม Tree Assets">
        <button className={toolbarButton} onClick={() => setExpanded(new Set(expandableIds))} type="button"><PanelLeftOpen aria-hidden="true" size={15}/>ขยายทั้งหมด</button>
        <button className={toolbarButton} onClick={() => setExpanded(new Set())} type="button"><PanelLeftClose aria-hidden="true" size={15}/>ย่อทั้งหมด</button>
      </div>
    </div>

    <div className="overflow-x-auto">
      <div className={`${tableGrid} sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-500`} role="row">
        <span role="columnheader">Tree Assets</span>
        <span role="columnheader">CODE ASSET</span>
        <span role="columnheader">ASSET LEVEL</span>
        <span role="columnheader">AREA / ZONE</span>
      </div>

      <div role="tree" aria-label={`Asset hierarchy Site ${siteCode}`}>
        {systems.map((system, index) => {
          const key = systemKey(system.id);
          const open = expanded.has(key);
          return <section className="border-b border-slate-200 last:border-b-0" key={system.id}>
            <div className={`${tableGrid} min-h-[76px] items-center px-5 transition-colors hover:bg-slate-50`} role="row">
              <button aria-expanded={open} className="flex min-h-[76px] min-w-0 cursor-pointer items-center text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-emerald-600" onClick={() => toggle(key)} type="button">
                <span className="grid h-9 w-7 shrink-0 place-items-center text-slate-500">{open ? <ChevronDown aria-hidden="true" size={15}/> : <ChevronRight aria-hidden="true" size={15}/>}</span>
                <Globe2 aria-hidden="true" className="ml-1 shrink-0 text-slate-300" size={17}/>
                <span className="ml-3 w-7 shrink-0 font-mono text-xs font-black text-slate-500">{index + 1}.</span>
                <span className="min-w-0 truncate text-[15px] font-black">{system.name}</span>
                <ChildCount items={system.branches} levels={["Main Asset", "Part-Asset"]}/>
              </button>
              <span aria-label="ไม่มี Code Asset" className="text-sm text-slate-500">—</span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">System</span>
              <span className="text-sm text-slate-500">—</span>
            </div>
            {open ? <TreeRows branches={system.branches} depth={1} expanded={expanded} onToggle={toggle} ancestorContinues={[]}/> : null}
          </section>;
        })}

        {review.length ? <section className="border-b border-amber-500/30">
          <div className={`${tableGrid} min-h-[76px] items-center px-5`} role="row">
            <div className="flex items-center">
              <span className="w-8"/>
              <CircleDot aria-hidden="true" className="shrink-0 text-amber-500" size={17}/>
              <span className="ml-3 font-black text-amber-800">รอตรวจสอบโครงสร้าง</span>
            </div>
            <span className="text-sm text-slate-500">—</span><span className="text-sm text-slate-500">—</span><span className="text-sm text-slate-500">—</span>
          </div>
          <TreeRows branches={review} depth={1} expanded={expanded} onToggle={toggle} ancestorContinues={[]}/>
        </section> : null}

        {!systems.length && !review.length ? <div className="min-w-[860px] px-6 py-16 text-center text-slate-500"><CircleDot className="mx-auto" size={30}/><h2 className="mt-3 font-black text-slate-900">ยังไม่พบ Asset</h2><p className="mt-1 text-sm">ลองเปลี่ยนตัวกรองเพื่อแสดงโครงสร้าง</p></div> : null}
      </div>
    </div>
  </section>;
}

function TreeRows({
  branches,
  depth,
  expanded,
  onToggle,
  ancestorContinues,
}: {
  branches: AssetTreeItem[];
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  ancestorContinues: boolean[];
}) {
  return <>{branches.map((branch, index) => {
    const key = assetKey(branch.id);
    const open = expanded.has(key);
    const isLast = index === branches.length - 1;
    const step = 36;
    const indent = depth * step;
    const parentAnchor = 14 + (depth - 1) * step;

    return <div className="relative border-t border-slate-200" key={branch.id} role="treeitem" aria-expanded={branch.children.length ? open : undefined} aria-level={depth + 1}>
      <div className={`${tableGrid} min-h-[76px] items-center px-5 transition-colors hover:bg-slate-50 focus-within:bg-slate-50`} role="row">
        <div className="relative flex min-w-0 items-center pr-5" style={{ paddingLeft: `${indent}px` }}>
          {ancestorContinues.map((continues, ancestorIndex) => continues ? <span aria-hidden="true" className={`absolute bottom-[-38px] top-[-38px] border-l ${treeLine}`} key={ancestorIndex} style={{ left: `${14 + ancestorIndex * step}px` }}/> : null)}
          {isLast
            ? <span aria-hidden="true" className={`absolute top-[-38px] h-[76px] rounded-bl-lg border-b border-l ${treeLine}`} style={{ left: `${parentAnchor}px`, width: `${step}px` }}/>
            : <><span aria-hidden="true" className={`absolute bottom-[-38px] top-[-38px] border-l ${treeLine}`} style={{ left: `${parentAnchor}px` }}/><span aria-hidden="true" className={`absolute top-1/2 border-t ${treeLine}`} style={{ left: `${parentAnchor}px`, width: `${step}px` }}/></>}

          {branch.children.length
            ? <button aria-label={`${open ? "ย่อ" : "ขยาย"} ${branch.code}`} aria-expanded={open} className="relative z-10 grid h-9 w-7 shrink-0 cursor-pointer place-items-center rounded-md bg-white text-slate-500 transition hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={() => onToggle(key)} type="button">{open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>
            : <span aria-hidden="true" className="relative z-10 h-9 w-7 shrink-0 bg-white"/>}

          <CircleDot aria-hidden="true" className="relative z-10 ml-1 shrink-0 bg-white text-slate-300" size={17}/>
          <span className="relative z-10 ml-3 w-7 shrink-0 bg-white font-mono text-xs font-black text-slate-500">{assetOrdinal(depth, index)}</span>
          <span className="relative z-10 min-w-0 bg-white">
            <span className="flex min-w-0 items-center gap-2">
              <Link className={`block min-w-0 truncate text-sm decoration-emerald-500 decoration-2 underline-offset-4 hover:text-emerald-700 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 font-semibold text-slate-700`} href={branch.detailHref}>{branch.name}</Link>
              {branch.levelLabel === "Main Asset" ? <ChildCount items={branch.children} levels={["Sub-Asset", "Part-Asset"]}/> : null}
            </span>
            {branch.contextOnly ? <span className="mt-0.5 block text-[10px] font-semibold text-amber-700">ลำดับแม่ · ไม่ตรงตัวกรอง</span> : null}
          </span>
        </div>
        <Link className="w-fit max-w-full truncate rounded font-mono text-sm font-bold text-slate-800 hover:text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" href={branch.detailHref}>{branch.code}</Link>
        <span className="text-xs font-bold text-slate-600">{branch.levelLabel}</span>
        <span className="truncate pr-3 text-sm font-semibold text-slate-700" title={branch.areaZone || "ยังไม่ระบุ"}>{branch.areaZone || "ยังไม่ระบุ"}</span>
      </div>
      {branch.children.length && open ? <TreeRows branches={branch.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} ancestorContinues={[...ancestorContinues, !isLast]}/> : null}
    </div>;
  })}</>;
}

function ChildCount({ items, levels }: { items: AssetTreeItem[]; levels: string[] }) {
  const summary = levels
    .map(level => ({ level, count: items.filter(item => item.levelLabel === level).length }))
    .filter(item => item.count > 0)
    .map(item => `${item.level} ${item.count} รายการ`)
    .join(" · ");
  return summary ? <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{summary}</span> : null;
}

const toolbarButton = "flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600";
function assetOrdinal(depth: number, index: number) { return depth % 2 === 1 ? `${String.fromCharCode(97 + (index % 26))}.` : `${index + 1}.`; }
function flatten(items: AssetTreeItem[]): AssetTreeItem[] { return items.flatMap(item => [item, ...flatten(item.children)]); }
function systemKey(id: string) { return `system:${id}`; }
function assetKey(id: string) { return `asset:${id}`; }
