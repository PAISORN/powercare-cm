"use client";

import { useCallback, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, CircleDot, CirclePlus, Globe2, MoreVertical, PanelLeftClose, PanelLeftOpen, Pencil, Trash2 } from "lucide-react";
import { AssetTreeCreateDrawer, type TreeAssetCreateAction, type TreeAssetCreateContext, type TreeAssetCreateOptions, type TreeAssetLevel } from "./asset-tree-create-drawer";
import { AssetTreeDeleteDialog, type TreeAssetDeleteAction } from "./asset-tree-delete-dialog";
import { AssetTreeDetailDialog } from "./asset-tree-detail-dialog";
import { AssetTreeEditDrawer, type TreeAssetEditAction, type TreeAssetEditData } from "./asset-tree-edit-drawer";
import { PreserveListPositionLink } from "./preserve-list-position";

export type AssetTreeItem = {
  id: string;
  systemId: string;
  systemName: string;
  assetLevel: TreeAssetLevel;
  code: string;
  name: string;
  levelLabel: string;
  areaZone: string;
  assetType: string;
  cmStatus: string | null;
  cmStatusDetail: string | null;
  pmStatus: string | null;
  statusLabel: string;
  criticalityLabel: string;
  contextOnly: boolean;
  imageUrl: string | null;
  detailHref: string;
  details: { label: string; value: string }[];
  editData: TreeAssetEditData;
  children: AssetTreeItem[];
};

export type AssetTreeSystem = {
  id: string;
  code: string;
  name: string;
  branches: AssetTreeItem[];
};

const tableGrid = "grid min-w-[1260px] grid-cols-[minmax(370px,2.3fr)_minmax(140px,0.85fr)_minmax(120px,0.72fr)_minmax(140px,0.8fr)_minmax(180px,1fr)_minmax(150px,0.9fr)_48px_44px]";
const treeLine = "border-slate-300";

export function AssetTreeWorkspace({ siteCode, systems, review, canCreateAssets = false, canRecodeAssets = false, createAction, editAction, deleteAction, createOptions }: { siteCode: string; systems: AssetTreeSystem[]; review: AssetTreeItem[]; canCreateAssets?: boolean; canRecodeAssets?: boolean; createAction?: TreeAssetCreateAction; editAction?: TreeAssetEditAction; deleteAction?: TreeAssetDeleteAction; createOptions?: TreeAssetCreateOptions }) {
  const allItems = useMemo(() => [...systems.flatMap(system => flatten(system.branches)), ...review], [systems, review]);
  const expandableIds = useMemo(() => new Set([
    ...systems.map(system => systemKey(system.id)),
    ...allItems.filter(item => item.children.length).map(item => assetKey(item.id)),
  ]), [systems, allItems]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [menu, setMenu] = useState<{ context: TreeAssetCreateContext; asset: AssetTreeItem | null; top: number; left: number } | null>(null);
  const [drawer, setDrawer] = useState<TreeAssetCreateContext | null>(null);
  const [detail, setDetail] = useState<AssetTreeItem | null>(null);
  const [editing, setEditing] = useState<AssetTreeItem | null>(null);
  const [deleting, setDeleting] = useState<AssetTreeItem | null>(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  function openMenu(button: HTMLButtonElement, context: TreeAssetCreateContext, asset: AssetTreeItem | null = null) {
    const rect = button.getBoundingClientRect();
    setMenu({ context, asset, top: Math.min(rect.bottom + 6, window.innerHeight - 178), left: Math.max(12, rect.right - 220) });
  }

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
      <div className={`${tableGrid} sticky top-0 z-20 border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-xs font-black uppercase tracking-[.08em] text-slate-700`} role="row">
        <span role="columnheader">Tree Assets</span>
        <span role="columnheader">CODE ASSET</span>
        <span role="columnheader">ASSET LEVEL</span>
        <span role="columnheader">AREA / ZONE</span>
        <span role="columnheader">สถานะ PM / CM</span>
        <span role="columnheader">ASSET TYPE</span>
        <span className="text-center" role="columnheader"><span className="sr-only">รายละเอียด Asset</span><BookOpen aria-hidden="true" className="mx-auto" size={16}/></span>
        <span className="text-center" role="columnheader"><span className="sr-only">เมนูเพิ่มเติม</span><MoreVertical aria-hidden="true" className="mx-auto" size={16}/></span>
      </div>

      <div role="tree" aria-label={`Asset hierarchy Site ${siteCode}`}>
        {systems.map((system, index) => {
          const key = systemKey(system.id);
          const open = expanded.has(key);
          return <section className="border-b border-slate-200 last:border-b-0" key={system.id}>
            <div className={`${tableGrid} min-h-[76px] items-center bg-violet-50/60 px-5 transition-colors hover:bg-violet-100/70`} role="row">
              <button aria-label={`${open ? "ย่อ" : "ขยาย"} ${system.name}`} aria-expanded={open} className="flex min-h-[76px] min-w-0 cursor-pointer items-center text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-emerald-600" onClick={() => toggle(key)} type="button">
                <span className="grid h-9 w-7 shrink-0 place-items-center text-slate-500">{open ? <ChevronDown aria-hidden="true" size={15}/> : <ChevronRight aria-hidden="true" size={15}/>}</span>
                <Globe2 aria-hidden="true" className="ml-1 shrink-0 text-violet-500" size={17}/>
                <span className="ml-3 w-7 shrink-0 font-mono text-xs font-black text-slate-500">{index + 1}.</span>
                <span className="min-w-0 truncate text-[15px] font-black text-violet-950">{system.name}</span>
                <ChildCount items={system.branches} levels={["Main Asset", "Sub-Asset", "Part-Asset"]}/>
              </button>
              <span aria-label="ไม่มี Code Asset" className="text-sm text-slate-500">—</span>
              <span className="w-fit rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">System</span>
              <span className="text-sm text-slate-500">—</span>
              <span className="text-sm text-slate-500">—</span>
              <span className="text-sm text-slate-500">—</span>
              <span aria-hidden="true"/>
              <AssetActionButton label={system.name} onClick={button => openMenu(button, { sourceKind: "system", sourceId: system.id, systemName: system.name, parentCode: null, parentName: null, allowedLevels: ["MAIN_ASSET", "SUB_ASSET", "PART"] })}/>
            </div>
            {open ? <TreeRows branches={system.branches} depth={1} expanded={expanded} onToggle={toggle} onOpenMenu={openMenu} onOpenDetail={setDetail} ancestorContinues={[]}/> : null}
          </section>;
        })}

        {review.length ? <section className="border-b border-amber-500/30">
          <div className={`${tableGrid} min-h-[76px] items-center px-5`} role="row">
            <div className="flex items-center">
              <span className="w-8"/>
              <CircleDot aria-hidden="true" className="shrink-0 text-amber-500" size={17}/>
              <span className="ml-3 font-black text-amber-800">รอตรวจสอบโครงสร้าง</span>
            </div>
            <span className="text-sm text-slate-500">—</span><span className="text-sm text-slate-500">—</span><span className="text-sm text-slate-500">—</span><span className="text-sm text-slate-500">—</span><span className="text-sm text-slate-500">—</span><span aria-hidden="true"/><span aria-hidden="true"/>
          </div>
          <TreeRows branches={review} depth={1} expanded={expanded} onToggle={toggle} onOpenMenu={openMenu} onOpenDetail={setDetail} ancestorContinues={[]}/>
        </section> : null}

        {!systems.length && !review.length ? <div className="min-w-[1260px] px-6 py-16 text-center text-slate-500"><CircleDot className="mx-auto" size={30}/><h2 className="mt-3 font-black text-slate-900">ยังไม่พบ Asset</h2><p className="mt-1 text-sm">ลองเปลี่ยนตัวกรองเพื่อแสดงโครงสร้าง</p></div> : null}
      </div>
    </div>
    {menu ? <>
      <button aria-label="ปิดเมนูเพิ่มเติม" className="fixed inset-0 z-[50] cursor-default" onClick={() => setMenu(null)} type="button"/>
      <div className="fixed z-[60] w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" role="menu" style={{ left: menu.left, top: menu.top }}>
        {canCreateAssets && menu.context.allowedLevels.length && createAction && createOptions ? <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => { setDrawer(menu.context); setMenu(null); }} role="menuitem" type="button"><CirclePlus size={17}/>เพิ่มรายการ</button> : null}
        {menu.asset && canCreateAssets ? <>
          <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => { setEditing(menu.asset); setMenu(null); }} role="menuitem" type="button"><Pencil size={17}/>แก้ไข</button>
          <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-bold text-rose-700 hover:bg-rose-50" onClick={() => { setDeleting(menu.asset); setMenu(null); }} role="menuitem" type="button"><Trash2 size={17}/>ลบ</button>
        </> : null}
        {!canCreateAssets ? <span className="block px-3 py-2 text-xs font-semibold text-slate-500">ไม่มีสิทธิ์จัดการ Asset</span> : null}
      </div>
    </> : null}
    {drawer && createAction && createOptions ? <AssetTreeCreateDrawer action={createAction} context={drawer} onClose={closeDrawer} options={createOptions}/> : null}
    {detail ? <AssetTreeDetailDialog asset={detail} onClose={() => setDetail(null)}/> : null}
    {editing && editAction && createOptions ? <AssetTreeEditDrawer action={editAction} asset={editing} canRecode={canRecodeAssets} onClose={() => setEditing(null)} options={createOptions}/> : null}
    {deleting && deleteAction && createOptions ? <AssetTreeDeleteDialog action={deleteAction} asset={deleting} onClose={() => setDeleting(null)} organizationId={createOptions.organizationId} plantId={createOptions.plantId}/> : null}
  </section>;
}

function TreeRows({
  branches,
  depth,
  expanded,
  onToggle,
  onOpenMenu,
  onOpenDetail,
  ancestorContinues,
}: {
  branches: AssetTreeItem[];
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onOpenMenu: (button: HTMLButtonElement, context: TreeAssetCreateContext, asset?: AssetTreeItem | null) => void;
  onOpenDetail: (asset: AssetTreeItem) => void;
  ancestorContinues: boolean[];
}) {
  return <>{branches.map((branch, index) => {
    const key = assetKey(branch.id);
    const open = expanded.has(key);
    const isLast = index === branches.length - 1;
    const step = 36;
    const indent = depth * step;
    const parentAnchor = 14 + (depth - 1) * step;
    const tone = assetLevelTone(branch.levelLabel);

    return <div className="relative border-t border-slate-200" id={`asset-tree-row-${branch.id}`} key={branch.id} role="treeitem" aria-expanded={branch.children.length ? open : undefined} aria-level={depth + 1}>
      <div className={`${tableGrid} min-h-[76px] items-center px-5 transition-colors hover:bg-slate-50 focus-within:bg-slate-50`} role="row">
        <div className="relative flex min-w-0 items-center pr-5" style={{ paddingLeft: `${indent}px` }}>
          {ancestorContinues.map((continues, ancestorIndex) => continues ? <span aria-hidden="true" className={`absolute bottom-[-38px] top-[-38px] border-l ${treeLine}`} key={ancestorIndex} style={{ left: `${14 + ancestorIndex * step}px` }}/> : null)}
          {isLast
            ? <span aria-hidden="true" className={`absolute top-[-38px] h-[76px] rounded-bl-lg border-b border-l ${treeLine}`} style={{ left: `${parentAnchor}px`, width: `${step}px` }}/>
            : <><span aria-hidden="true" className={`absolute bottom-[-38px] top-[-38px] border-l ${treeLine}`} style={{ left: `${parentAnchor}px` }}/><span aria-hidden="true" className={`absolute top-1/2 border-t ${treeLine}`} style={{ left: `${parentAnchor}px`, width: `${step}px` }}/></>}

          {branch.children.length
            ? <button aria-label={`${open ? "ย่อ" : "ขยาย"} ${branch.code}`} aria-expanded={open} className="relative z-10 grid h-9 w-7 shrink-0 cursor-pointer place-items-center rounded-md bg-white text-slate-500 transition hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={() => onToggle(key)} type="button">{open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>
            : <span aria-hidden="true" className="relative z-10 h-9 w-7 shrink-0 bg-white"/>}

          <CircleDot aria-hidden="true" className={`relative z-10 ml-1 shrink-0 bg-white ${tone.icon}`} size={17}/>
          <span className="relative z-10 ml-3 w-7 shrink-0 bg-white font-mono text-xs font-black text-slate-500">{assetOrdinal(depth, index)}</span>
          <span className="relative z-10 min-w-0 bg-white">
            <span className="flex min-w-0 items-center gap-2">
              <PreserveListPositionLink className={`block min-w-0 truncate text-sm decoration-emerald-500 decoration-2 underline-offset-4 hover:text-emerald-700 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 font-semibold ${tone.name}`} href={branch.detailHref} storageKey="assets" targetId={`asset-tree-row-${branch.id}`}>{branch.name}</PreserveListPositionLink>
              {branch.levelLabel === "Main Asset" ? <ChildCount items={branch.children} levels={["Sub-Asset", "Part-Asset"]}/> : null}
            </span>
            {branch.contextOnly ? <span className="mt-0.5 block text-[10px] font-semibold text-amber-700">ลำดับแม่ · ไม่ตรงตัวกรอง</span> : null}
          </span>
        </div>
        <PreserveListPositionLink className="w-fit max-w-full truncate rounded font-mono text-sm font-bold text-slate-800 hover:text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" href={branch.detailHref} storageKey="assets" targetId={`asset-tree-row-${branch.id}`}>{branch.code}</PreserveListPositionLink>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${tone.badge}`}>{branch.levelLabel}</span>
        <span className="truncate pr-3 text-sm font-semibold text-slate-700" title={branch.areaZone || "ยังไม่ระบุ"}>{branch.areaZone || "ยังไม่ระบุ"}</span>
        <MaintenanceStatus item={branch}/>
        <span className="truncate pr-3 text-sm font-semibold text-slate-700" title={branch.assetType || "ยังไม่ระบุ"}>{branch.assetType || "ยังไม่ระบุ"}</span>
        <AssetDetailButton asset={branch} onClick={() => onOpenDetail(branch)}/>
        <AssetActionButton label={branch.code} onClick={button => onOpenMenu(button, { sourceKind: "asset", sourceId: branch.id, systemName: branch.systemName, parentCode: branch.code, parentName: branch.name, allowedLevels: allowedChildLevels(branch.assetLevel) }, branch)}/>
      </div>
      {branch.children.length && open ? <TreeRows branches={branch.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} onOpenMenu={onOpenMenu} onOpenDetail={onOpenDetail} ancestorContinues={[...ancestorContinues, !isLast]}/> : null}
    </div>;
  })}</>;
}

function AssetDetailButton({ asset, onClick }: { asset: AssetTreeItem; onClick: () => void }) {
  return <button aria-label={`ดูรายละเอียด ${asset.code}`} className="mx-auto grid h-11 w-11 place-items-center rounded-xl text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={onClick} title="ดูรายละเอียด Asset" type="button"><BookOpen aria-hidden="true" size={18}/></button>;
}

function AssetActionButton({ label, onClick }: { label: string; onClick: (button: HTMLButtonElement) => void }) {
  return <button aria-label={`เมนูเพิ่มเติม ${label}`} className="mx-auto grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={event => onClick(event.currentTarget)} title="เมนูเพิ่มเติม" type="button"><MoreVertical aria-hidden="true" size={18}/></button>;
}

function allowedChildLevels(level: TreeAssetLevel): TreeAssetLevel[] {
  if (level === "MAIN_ASSET") return ["SUB_ASSET", "PART"];
  if (level === "SUB_ASSET") return ["PART"];
  return [];
}

function MaintenanceStatus({ item }: { item: AssetTreeItem }) {
  return <div className="grid gap-1 pr-2">
    <StatusPill kind="CM" status={item.cmStatus} detail={item.cmStatusDetail}/>
    <StatusPill kind="PM" status={item.pmStatus}/>
  </div>;
}

function StatusPill({ kind, status, detail }: { kind: "CM" | "PM"; status: string | null; detail?: string | null }) {
  const label = kind === "CM" ? cmStatusLabel(status) : pmStatusLabel(status);
  return <span className={`w-fit max-w-full truncate rounded-full px-2 py-1 text-[10px] font-bold ${workStatusTone(status)}`} title={`${kind}: ${label}${detail ? ` · ${detail}` : ""}`}>
    {kind}: {label}{detail ? ` · ${detail}` : ""}
  </span>;
}

function assetLevelTone(level: string) {
  if (level === "Main Asset") return { icon: "text-blue-500", name: "text-blue-950", badge: "bg-blue-100 text-blue-700" };
  if (level === "Sub-Asset") return { icon: "text-amber-500", name: "text-amber-950", badge: "bg-amber-100 text-amber-700" };
  return { icon: "text-emerald-500", name: "text-emerald-950", badge: "bg-emerald-100 text-emerald-700" };
}

function cmStatusLabel(status: string | null) {
  return ({ NEW: "แจ้งใหม่", WAITING_TO_CLAIM: "รอรับงาน", CLAIMED: "รับเรื่องแล้ว", IN_PROGRESS: "กำลังดำเนินการ", BACKLOG_SHUTDOWN: "Backlog Shutdown", WAITING_TO_CLOSE: "รอปิดงาน", RETURNED_FOR_CORRECTION: "ส่งกลับแก้ไข", CLOSED: "ปิดงานแล้ว", CANCELED: "ยกเลิก" } as Record<string, string>)[status || ""] || "ยังไม่มี";
}

function pmStatusLabel(status: string | null) {
  return ({ PLANNED: "วางแผนแล้ว", IN_PROGRESS: "กำลังดำเนินการ", COMPLETED: "เสร็จแล้ว", CANCELED: "ยกเลิก" } as Record<string, string>)[status || ""] || "ยังไม่มี";
}

function workStatusTone(status: string | null) {
  if (["CLOSED", "COMPLETED"].includes(status || "")) return "bg-emerald-100 text-emerald-700";
  if (["IN_PROGRESS", "CLAIMED", "WAITING_TO_CLOSE"].includes(status || "")) return "bg-blue-100 text-blue-700";
  if (["PLANNED", "NEW", "WAITING_TO_CLAIM"].includes(status || "")) return "bg-violet-100 text-violet-700";
  if (["BACKLOG_SHUTDOWN", "RETURNED_FOR_CORRECTION"].includes(status || "")) return "bg-amber-100 text-amber-700";
  if (status === "CANCELED") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-500";
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
