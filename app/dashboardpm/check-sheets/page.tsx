import { ClipboardCheck, LockKeyhole, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildAssetHierarchy, type AssetBranch } from "../../../components/asset-hierarchy";
import { ConfirmDeleteButton } from "../../../components/confirm-delete-button";
import { PmCheckSheetTree, type PmCheckSheetTreeItem } from "../../../components/pm/pm-check-sheet-tree";
import { PmRouteShell } from "../../../components/pm/pm-route-shell";
import TechnicalFieldConfig from "../../../components/technical-field-config";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { canManagePmPlans, canManagePmGroups } from "../../../modules/auth/permission";
import { resolvePmPageScope } from "../../../modules/pm/pm-page-scope";
import { createPmCheckSheetItem, retirePmCheckSheetItem, updatePmCheckSheetItem } from "../../../modules/pm/pm-check-sheet";

type Query = {
  organizationId?: string;
  plantId?: string;
  assetId?: string;
  new?: string;
  editItemId?: string;
  saved?: string;
  deleted?: string;
  error?: string;
};

const inputClass = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

export default async function PmCheckSheetsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  if (!canManagePmPlans(user)) redirect("/dashboardpm/calendar");
  const query = await searchParams;
  const scope = await resolvePmPageScope(user, query);
  const serviceScope = { organizationId: scope.organization.id, plantId: scope.plant.id };
  const [systems, assets] = await Promise.all([
    db.assetSystem.findMany({ where: { plantId: scope.plant.id }, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    db.asset.findMany({
      where: { plantId: scope.plant.id, registrationStatus: "ACTIVE" },
      select: {
        id: true,
        parentId: true,
        systemId: true,
        assetLevel: true,
        code: true,
        nameTh: true,
        nameEn: true,
        assetType: {
          select: {
            code: true,
            nameTh: true,
            fields: {
              where: { active: true },
              orderBy: [{ sortOrder: "asc" }, { labelTh: "asc" }],
              select: { id: true, labelTh: true, labelEn: true, dataType: true, unit: true, optionsJson: true, helpText: true, indicatorText: true, required: true, sortOrder: true },
            },
          },
        },
        pmCheckSheetItems: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ code: "asc" }, { nameTh: "asc" }],
    }),
  ]);
  const hierarchy = buildAssetHierarchy(assets, new Set(assets.map((asset) => asset.id)), new Set(systems.map((system) => system.id)));
  const scopeParams = new URLSearchParams(serviceScope);
  const hrefFor = (assetId: string, extra: Record<string, string> = {}) => {
    const params = new URLSearchParams(scopeParams);
    params.set("assetId", assetId);
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
    return `/dashboardpm/check-sheets?${params}`;
  };
  const toTreeItem = (branch: AssetBranch<(typeof assets)[number]>): PmCheckSheetTreeItem => ({
    id: branch.asset.id,
    code: branch.asset.code ?? "—",
    name: branch.asset.nameTh || branch.asset.nameEn || "ไม่ระบุชื่อ",
    level: branch.asset.assetLevel === "MAIN_ASSET" ? "Main Asset" : branch.asset.assetLevel === "SUB_ASSET" ? "Sub-Asset" : "Part-Asset",
    assetType: branch.asset.assetType ? `${branch.asset.assetType.code} · ${branch.asset.assetType.nameTh}` : "",
    href: hrefFor(branch.asset.id),
    children: branch.children.map(toTreeItem),
  });
  const treeSystems = systems.map((system) => ({
    id: system.id,
    code: system.code,
    name: system.nameTh || system.nameEn || system.code,
    branches: hierarchy.roots.filter((root) => root.asset.systemId === system.id).map(toTreeItem),
  })).filter((system) => system.branches.length);
  const review = hierarchy.review.map((asset) => toTreeItem({ asset, contextOnly: false, children: [] }));
  const selected = query.assetId ? assets.find((asset) => asset.id === query.assetId) : undefined;
  const editingItem = selected?.pmCheckSheetItems.find((item) => item.id === query.editItemId);
  const closeHref = selected ? hrefFor(selected.id) : `/dashboardpm/check-sheets?${scopeParams}`;

  async function createAction(data: FormData) {
    "use server";
    const actor = await requireUser();
    const assetId = String(data.get("assetId") ?? "");
    try {
      await createPmCheckSheetItem(actor, { ...serviceScope, assetId, ...itemInput(data) });
    } catch (error) {
      redirect(pmCheckSheetHref(serviceScope, assetId, { error: errorMessage(error) }));
    }
    redirect(pmCheckSheetHref(serviceScope, assetId, { saved: "created" }));
  }

  async function updateAction(data: FormData) {
    "use server";
    const actor = await requireUser();
    const assetId = String(data.get("assetId") ?? "");
    try {
      await updatePmCheckSheetItem(actor, { ...serviceScope, assetId, itemId: String(data.get("itemId") ?? ""), ...itemInput(data) });
    } catch (error) {
      redirect(pmCheckSheetHref(serviceScope, assetId, { error: errorMessage(error) }));
    }
    redirect(pmCheckSheetHref(serviceScope, assetId, { saved: "updated" }));
  }

  async function deleteAction(data: FormData) {
    "use server";
    const actor = await requireUser();
    const assetId = String(data.get("assetId") ?? "");
    try {
      await retirePmCheckSheetItem(actor, { ...serviceScope, assetId, itemId: String(data.get("itemId") ?? "") });
    } catch (error) {
      redirect(pmCheckSheetHref(serviceScope, assetId, { error: errorMessage(error) }));
    }
    redirect(pmCheckSheetHref(serviceScope, assetId, { deleted: "1" }));
  }

  return <>
    <PmRouteShell title="PM Check Sheet" description="กำหนดรายการตรวจสอบมาตรฐานและรายการเฉพาะ Asset ก่อนนำไปสร้างใบงาน PM" scope={scope} currentPage="check-sheets" canManageGroups={canManagePmGroups(user)} scopeAction="/dashboardpm/check-sheets" />
    <main className="mx-auto mt-5 grid w-full max-w-[1680px] gap-5 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]" aria-label="PM Check Sheet Setup">
      <PmCheckSheetTree systems={treeSystems} review={review} selectedAssetId={selected?.id}/>
      <section className="min-w-0">
        {query.saved ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700" role="status">บันทึก Custom Checklist แล้ว</p> : null}
        {query.deleted ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700" role="status">ลบ Custom Checklist จากงานใหม่แล้ว โดยประวัติเดิมยังคงอยู่</p> : null}
        {query.error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{query.error}</p> : null}
        {selected ? <>
          <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">PM Check Sheet Setup</p>
                <h2 className="mt-1 break-words text-2xl font-black">{selected.code ?? "—"} · {selected.nameTh}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{selected.assetType ? `${selected.assetType.code} · ${selected.assetType.nameTh}` : "ยังไม่ได้ระบุ Asset Type"}</p>
              </div>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700" href={hrefFor(selected.id, { new: "1" })} prefetch={false} scroll={false}><Plus size={17}/>Add Checklist</Link>
            </header>
            <div className="divide-y divide-[var(--line)]">
              {(selected.assetType?.fields ?? []).map((field, index) => <ChecklistRow key={`default-${field.id}`} index={index + 1} label={field.labelTh} detail={itemDetail(field)} source="Default" locked />)}
              {selected.pmCheckSheetItems.map((item, index) => <div className="grid gap-3 p-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center" id={`pm-check-sheet-item-${item.id}`} key={item.id}>
                <span className="text-sm font-black text-slate-400">{(selected.assetType?.fields.length ?? 0) + index + 1}.</span>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{item.labelTh}</p><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">Custom</span></div><p className="mt-1 text-xs text-slate-500">{itemDetail(item)}</p></div>
                <div className="flex gap-2"><Link aria-label={`แก้ไข ${item.labelTh}`} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700" href={hrefFor(selected.id, { editItemId: item.id })} scroll={false}><Pencil size={16}/></Link><form action={deleteAction}><input type="hidden" name="assetId" value={selected.id}/><input type="hidden" name="itemId" value={item.id}/><ConfirmDeleteButton label={item.labelTh} compact message={`ยืนยันลบ ${item.labelTh} ออกจาก PM Check Sheet สำหรับงานใหม่? ใบงานที่สร้างแล้วจะยังใช้ Snapshot เดิม`}/></form></div>
              </div>)}
              {!(selected.assetType?.fields.length || selected.pmCheckSheetItems.length) ? <div className="p-10 text-center"><ClipboardCheck className="mx-auto text-slate-300" size={34}/><p className="mt-3 font-black">ยังไม่มีรายการตรวจสอบ</p><p className="mt-1 text-sm text-slate-500">เพิ่ม Custom Checklist หรือกำหนดรายการมาตรฐานใน Technical Field Templates</p></div> : null}
            </div>
          </section>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600"><LockKeyhole className="mt-0.5 shrink-0" size={14}/>Default Checklist อ้างอิง Technical Field Templates แบบสดและแก้ไขไม่ได้จากหน้านี้ ส่วน PM Work จะเก็บ Snapshot เมื่อถูกสร้าง</p>
        </> : <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center"><div><ClipboardCheck className="mx-auto text-emerald-500" size={42}/><h2 className="mt-4 text-xl font-black">เลือก Asset จาก Assets Tree</h2><p className="mt-2 text-sm text-[var(--muted)]">ระบบจะแสดง Default และ Custom Checklist ของ Asset นั้น</p></div></div>}
      </section>
    </main>
    {selected && query.new === "1" ? <ChecklistDrawer title="เพิ่ม Custom Checklist" closeHref={closeHref} action={createAction} assetId={selected.id}/> : null}
    {selected && editingItem ? <ChecklistDrawer title={`แก้ไข ${editingItem.labelTh}`} closeHref={closeHref} action={updateAction} assetId={selected.id} item={editingItem}/> : null}
  </>;
}

function ChecklistRow({ index, label, detail, source, locked }: { index: number; label: string; detail: string; source: string; locked?: boolean }) {
  return <div className="grid gap-3 p-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"><span className="text-sm font-black text-slate-400">{index}.</span><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{label}</p><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">{source}</span></div><p className="mt-1 text-xs text-slate-500">{detail}</p></div>{locked ? <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><LockKeyhole size={13}/>แก้ไขที่ Template</span> : null}</div>;
}

function ChecklistDrawer({ title, closeHref, action, assetId, item }: { title: string; closeHref: string; action: (data: FormData) => Promise<void>; assetId: string; item?: { id: string; labelTh: string; dataType: string; unit: string | null; optionsJson: string | null; helpText: string | null; indicatorText: string | null; required: boolean } }) {
  return <><Link aria-label="ปิด Checklist drawer" className="fixed inset-0 z-[290] bg-slate-950/30 backdrop-blur-md" href={closeHref} scroll={false}/><aside aria-modal="true" className="fixed inset-y-0 right-0 z-[300] w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7" role="dialog"><div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4"><div><p className="text-sm font-bold text-emerald-700">Custom Checklist</p><h2 className="mt-1 text-2xl font-black">{title}</h2></div><Link aria-label="ปิด" className="grid size-10 place-items-center rounded-full bg-[var(--soft)]" href={closeHref} scroll={false}><X size={18}/></Link></div><form action={action} className="mt-5 grid gap-3"><input type="hidden" name="assetId" value={assetId}/>{item ? <input type="hidden" name="itemId" value={item.id}/> : null}<label className="grid gap-1 text-sm font-bold">ชื่อหัวข้อ<input className={inputClass} name="labelTh" defaultValue={item?.labelTh ?? ""} required maxLength={200}/></label><label className="grid gap-1 text-sm font-bold">ชนิดข้อมูล<TechnicalFieldConfig initialDataType={item?.dataType} initialOptions={parseOptions(item?.optionsJson)}/></label><label className="grid gap-1 text-sm font-bold">หน่วย<input className={inputClass} name="unit" defaultValue={item?.unit ?? ""}/></label><label className="grid gap-1 text-sm font-bold">คำแนะนำ<input className={inputClass} name="helpText" defaultValue={item?.helpText ?? ""}/></label><label className="grid gap-1 text-sm font-bold">Indicator<textarea className={inputClass} name="indicatorText" defaultValue={item?.indicatorText ?? ""} rows={3}/></label><label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold"><input defaultChecked={item?.required} name="required" type="checkbox"/>บังคับกรอก</label><button className="mt-2 min-h-11 rounded-xl bg-emerald-600 px-4 font-black text-white hover:bg-emerald-700">บันทึก Checklist</button></form></aside></>;
}

function itemInput(data: FormData) {
  return { labelTh: String(data.get("labelTh") ?? ""), dataType: String(data.get("dataType") ?? "TEXT"), unit: String(data.get("unit") ?? ""), options: String(data.get("options") ?? ""), helpText: String(data.get("helpText") ?? ""), indicatorText: String(data.get("indicatorText") ?? ""), required: data.get("required") === "on" };
}

function itemDetail(item: { dataType: string; unit: string | null; required: boolean; indicatorText?: string | null }) {
  return [item.dataType, item.unit, item.required ? "Required" : null, item.indicatorText].filter(Boolean).join(" · ");
}

function parseOptions(value: string | null | undefined) {
  try { const parsed = JSON.parse(value ?? "null"); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; }
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Unable to save PM Check Sheet"; }

function pmCheckSheetHref(scope: { organizationId: string; plantId: string }, assetId: string, extra: Record<string, string>) {
  const params = new URLSearchParams(scope);
  params.set("assetId", assetId);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return `/dashboardpm/check-sheets?${params}`;
}
