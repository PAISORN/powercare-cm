import Link from "next/link";
import { AssetBranches, buildAssetHierarchy, assetLevelLabel } from "../../components/asset-hierarchy";
import { PreserveListPositionLink, RestoreListPosition } from "../../components/preserve-list-position";
import { redirect } from "next/navigation";
import { Boxes, ChevronLeft, ChevronRight, CirclePlus, Download, FolderTree, Gauge, List, Search, Settings2, Upload, Wrench } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { AdminSiteScopeSelector } from "../../components/admin-site-scope-selector";
import { AutoSubmitSelect } from "../../components/auto-submit-select";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { formatThaiDate } from "../../lib/date-time/bangkok-time";
import { paginationWindow } from "../../lib/pagination-window";
import { canManageAssetMasters, canManageAssets, canViewAssets } from "../../modules/auth/permission";
import { resolveAssetScope } from "../../modules/assets/asset-scope";
import { assetStatusLabel, criticalityLabel } from "../../modules/assets/asset-service";

type Query = { organizationId?: string; plantId?: string; search?: string; assetClassId?: string; familyId?: string; zoneId?: string; status?: string; criticality?: string; systemId?: string; assetTypeId?: string; assetLevel?: string; discipline?: string; sort?: string; view?: string; page?: string };

const PAGE_SIZE = 50;

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  if (!canViewAssets(user)) redirect("/dashboardcm");
  const query = await searchParams;
  const scope = await resolveAssetScope(user, query);
  const hierarchy = query.view !== "list";
  const where = {
    plantId: scope.plant.id,
    registrationStatus: "ACTIVE",
    ...(query.systemId ? { systemId: query.systemId } : {}),
    ...(query.assetTypeId ? { assetTypeId: query.assetTypeId } : {}),
    ...(query.assetLevel ? { assetLevel: query.assetLevel } : {}),
    ...(query.discipline ? { discipline: query.discipline } : {}),
    ...(query.assetClassId ? { assetClassId: query.assetClassId } : {}),
    ...(query.familyId ? { familyId: query.familyId } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.status ? { operatingStatus: query.status } : {}),
    ...(query.criticality ? { criticality: query.criticality } : {}),
    ...(query.search ? { OR: [
      { code: { contains: query.search } }, { nameTh: { contains: query.search } }, { nameEn: { contains: query.search } },
      { tagKks: { contains: query.search } }, { serialNumber: { contains: query.search } }, { manufacturer: { contains: query.search } }, { model: { contains: query.search } },
    ] } : {}),
  };
  const pagedWhere = where;
  const filteredTotal = await db.asset.count({ where: pagedWhere });
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const requestedPage = Number.parseInt(query.page || "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const [assets, assetClasses, families, zones, total, underRepair, critical, systems, types, treeAssets] = await Promise.all([
    db.asset.findMany({ where: pagedWhere, include: { family: true, assetType: true, zone: true, system: true, cmWorks: { where: { status: "CLOSED" }, orderBy: { closedAt: "desc" }, take: 1 } }, orderBy: query.sort === "name" ? [{ nameTh: "asc" }, { code: "asc" }] : [{ code: query.sort === "codeDesc" ? "desc" : "asc" }], skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.assetClass.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: [{ nameTh: "asc" }, { nameEn: "asc" }] }),
    db.assetFamily.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { code: "asc" } }),
    db.zone.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { name: "asc" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE", operatingStatus: "UNDER_REPAIR" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE", criticality: "CRITICAL" } }),
    db.assetSystem.findMany({ where: { plantId: scope.plant.id }, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    db.assetType.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { nameTh: "asc" } }),
    hierarchy ? db.asset.findMany({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE" }, include: { family: true, assetType: true, zone: true, system: true, cmWorks: { where: { status: "CLOSED" }, orderBy: { closedAt: "desc" }, take: 1 } }, orderBy: query.sort === "name" ? [{ nameTh: "asc" }, { code: "asc" }] : [{ code: query.sort === "codeDesc" ? "desc" : "asc" }] }) : Promise.resolve([]),
  ]);
  const shown = assets;
  const tree = buildAssetHierarchy(treeAssets, new Set(assets.map(asset => asset.id)), new Set(systems.map(system => system.id)));
  const listUrl = pageUrl({ ...query, organizationId: scope.organization.id, plantId: scope.plant.id }, currentPage);
  const row = (asset: typeof assets[number], contextOnly = false) => <AssetRow asset={asset} contextOnly={contextOnly} listUrl={listUrl}/>;
  const firstShown = filteredTotal ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(currentPage * PAGE_SIZE, filteredTotal);
  return <AppShell>
    <RestoreListPosition storageKey="assets" enabled/>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">Asset registry</p><h1 className="mt-2 text-3xl font-black">ทะเบียนเครื่องจักรและอุปกรณ์</h1><p className="mt-2 text-sm text-[var(--muted)]">ข้อมูลกลางสำหรับเชื่อม Corrective และ Preventive Maintenance</p></div>
      <div className="flex flex-wrap gap-2"><a href={`/assets/export?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Download size={17}/>Export Excel</a>{canManageAssets(user)?<Link href={`/assets/import?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Upload size={17}/>Import Excel</Link>:null}{canManageAssetMasters(user) ? <Link href={`/assets/master-data?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Settings2 size={17}/>Master Data</Link> : null}{canManageAssets(user) ? <Link href={`/assets/new?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={primaryButton}><CirclePlus size={17}/>สร้าง Asset</Link> : null}</div>
    </header>
    {scope.canSelectPlant || scope.canSelectOrganization ? <div className="mt-6"><AdminSiteScopeSelector scope={scope} title="Asset scope" description="ข้อมูลทะเบียนถูกแยกตาม Site" /></div> : null}
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <Kpi icon={Boxes} label="Assets ทั้งหมด" value={total} tone="emerald"/><Kpi icon={Wrench} label="ปิดซ่อม" value={underRepair} tone="amber"/><Kpi icon={Gauge} label="Critical" value={critical} tone="red"/>
    </section>
    <form className="mt-5 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="organizationId" value={scope.organization.id}/><input type="hidden" name="plantId" value={scope.plant.id}/><input type="hidden" name="view" value={query.view || "tree"}/>
      <label className="relative"><Search className="absolute left-3 top-3.5 text-[var(--muted)]" size={17}/><input aria-label="ค้นหา Asset" name="search" defaultValue={query.search} className={`${inputClass} w-full pl-10`} placeholder="ค้นหารหัส ชื่อ Tag/KKS Serial ผู้ผลิต รุ่น"/></label>
      <AutoSubmitSelect aria-label="System" name="systemId" defaultValue={query.systemId} className={inputClass}><option value="">ทุก System</option>{systems.map(x => <option key={x.id} value={x.id}>{x.code} · {x.nameEn || x.nameTh}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Type" name="assetTypeId" defaultValue={query.assetTypeId} className={inputClass}><option value="">ทุก Asset Type</option>{types.map(x => <option key={x.id} value={x.id}>{x.nameEn || x.nameTh}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Level" name="assetLevel" defaultValue={query.assetLevel} className={inputClass}><option value="">ทุกระดับ</option>{["MAIN_ASSET","SUB_ASSET","PART"].map(x => <option key={x} value={x}>{assetLevelLabel(x)}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Discipline" name="discipline" defaultValue={query.discipline} className={inputClass}><option value="">ทุก Discipline</option>{["Mechanical","Electrical","Instrument","Control"].map(x => <option key={x}>{x}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="เรียงลำดับ" name="sort" defaultValue={query.sort} className={inputClass}><option value="">รหัส น้อยไปมาก</option><option value="codeDesc">รหัส มากไปน้อย</option><option value="name">ชื่อ</option></AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Class" name="assetClassId" defaultValue={query.assetClassId} className={inputClass}><option value="">ทุก Asset Class</option>{assetClasses.map(x => <option key={x.id} value={x.id}>{x.nameEn || x.nameTh}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Families" name="familyId" defaultValue={query.familyId} className={inputClass}><option value="">ทุก Asset Families</option>{families.map(x => <option key={x.id} value={x.id}>{x.code} · {x.nameEn || x.nameTh || "ไม่ระบุชื่อ"}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Zone" name="zoneId" defaultValue={query.zoneId} className={inputClass}><option value="">ทุก Area / Zone</option>{zones.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset status" name="status" defaultValue={query.status} className={inputClass}><option value="">ทุกสถานะ</option>{["IN_SERVICE","UNDER_REPAIR","STANDBY","TEMPORARILY_OUT","RETIRED"].map(x => <option key={x} value={x}>{assetStatusLabel(x)}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Criticality" name="criticality" defaultValue={query.criticality} className={inputClass}><option value="">ทุก Criticality</option>{["CRITICAL","HIGH","MEDIUM","LOW"].map(x => <option key={x}>{x}</option>)}</AutoSubmitSelect>
      <button className={primaryButton}>ค้นหา</button>
    </form>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">พบ {filteredTotal} รายการ · แสดง {firstShown}-{lastShown}</p><div className="flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1"><ViewLink active={!hierarchy} href={viewUrl(query, "list")} icon={List}>รายการ</ViewLink><ViewLink active={hierarchy} href={viewUrl(query, "tree")} icon={FolderTree}>โครงสร้าง</ViewLink></div></div>
    <section className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="hidden grid-cols-[minmax(300px,2fr)_1fr_1fr_1fr_1fr] gap-3 border-b border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)] md:grid"><span>Asset</span><span>Zone</span><span>Type</span><span>Status</span><span>CM / PM ล่าสุด</span></div>
      {hierarchy ? <div className="p-3"><h2 className="px-2 py-3 text-lg font-black">Site {scope.plant.code}</h2><p className="mb-3 px-2 text-xs text-[var(--muted)]">แสดงผลที่ตรงตัวกรองในหน้านี้ พร้อมลำดับแม่เพื่อบอกตำแหน่ง</p>{systems.map(system => {const roots=tree.roots.filter(root=>root.asset.systemId===system.id);return roots.length ? <section key={system.id} className="mb-3 rounded-xl border border-[var(--line)]"><h3 className="border-b border-[var(--line)] bg-[var(--soft)] px-4 py-3 font-bold">System · {system.code} · {system.nameEn || system.nameTh}</h3><AssetBranches branches={roots} renderRow={row}/></section>:null;})}{tree.review.length>0?<section className="mt-4 rounded-xl border border-amber-500/40 p-3"><h3 className="font-bold text-amber-700 dark:text-amber-400">รอตรวจสอบโครงสร้าง ({tree.review.length})</h3><p className="my-2 text-sm text-[var(--muted)]">ยังไม่ยืนยัน System ระดับ หรือ Parent ที่เกี่ยวข้อง</p>{tree.review.map(asset=><div key={asset.id}>{row(asset)}</div>)}</section>:null}</div> : shown.map(asset => <AssetRow key={asset.id} asset={asset} listUrl={listUrl}/>)}
      {!shown.length ? <div className="px-5 py-16 text-center"><Boxes className="mx-auto text-[var(--muted)]"/><h2 className="mt-3 font-bold">ยังไม่พบ Asset</h2><p className="mt-1 text-sm text-[var(--muted)]">ลองเปลี่ยนตัวกรองหรือสร้าง Asset รายการแรก</p></div> : null}
    </section>
    {totalPages > 1 ? <Pagination query={query} currentPage={currentPage} totalPages={totalPages}/> : null}
  </AppShell>;
}

const inputClass = "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500";
const primaryButton = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
const secondaryButton = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition hover:bg-[var(--soft)]";
function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: number; tone: "emerald"|"amber"|"red" }) { const tones={emerald:"bg-emerald-500/10 text-emerald-600",amber:"bg-amber-500/10 text-amber-600",red:"bg-red-500/10 text-red-600"}; return <div className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon size={21}/></span><div><p className="text-sm text-[var(--muted)]">{label}</p><p className="text-2xl font-black">{value}</p></div></div>; }
function ViewLink({ active, href, icon: Icon, children }: { active: boolean; href: string; icon: typeof List; children: React.ReactNode }) { return <Link href={href} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${active ? "bg-emerald-600 text-white" : "hover:bg-[var(--soft)]"}`}><Icon size={16}/>{children}</Link>; }
function AssetRow({ asset, contextOnly=false, listUrl }: { asset: any; contextOnly?: boolean; listUrl: string }) { return <div id={`asset-row-${asset.id}`} className="border-b border-[var(--line)] last:border-0"><PreserveListPositionLink storageKey="assets" targetId={`asset-row-${asset.id}`} href={`/assets/${asset.id}?returnTo=${encodeURIComponent(`${listUrl}#asset-row-${asset.id}`)}`} className="grid gap-3 px-4 py-4 transition hover:bg-[var(--soft)] md:grid-cols-[minmax(230px,2fr)_1fr_1fr_1fr_1fr] md:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--soft)] text-emerald-600">{asset.imageStoragePath?<img src={`/asset-images/${asset.id}`} alt={`รูป ${asset.nameEn||asset.nameTh}`} loading="lazy" className="h-full w-full object-cover"/>:<Boxes aria-hidden="true" size={25}/>}</span><span className="min-w-0"><span className="block font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">{asset.code}</span><span className="mt-1 block break-words font-bold">{asset.nameEn||asset.nameTh}</span><span className="block text-xs text-[var(--muted)]">{assetLevelLabel(asset.assetLevel)}{asset.tagKks ? ` · ${asset.tagKks}` : ""}</span>{contextOnly?<span className="mt-1 block text-xs font-semibold text-amber-700 dark:text-amber-400">ลำดับแม่ · ไม่ตรงตัวกรอง</span>:null}</span></div><div className="text-sm"><p>{asset.zone?.name || "ไม่ระบุ Area / Zone"}</p><p className="text-xs text-[var(--muted)]">{asset.installationLocation || asset.system?.nameEn || asset.system?.nameTh || "-"}</p></div><div className="text-sm">{asset.assetType?.nameEn || asset.assetType?.nameTh || "รอระบุประเภท"}<p className="text-xs text-[var(--muted)]">{asset.discipline}</p></div><div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold">{assetStatusLabel(asset.operatingStatus)}</span><p className="mt-2 text-xs font-bold">{criticalityLabel(asset.criticality)}</p></div><div className="text-xs text-[var(--muted)]"><p>CM: {asset.cmWorks[0]?.closedAt ? formatThaiDate(asset.cmWorks[0].closedAt) : "ยังไม่มี"}</p><p className="mt-1">PM: ดูในประวัติเครื่อง</p></div></PreserveListPositionLink></div>; }
function Pagination({query,currentPage,totalPages}:{query:Query;currentPage:number;totalPages:number}) { const pages=paginationRange(currentPage,totalPages); return <nav aria-label="Asset pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm"><p className="px-1 text-sm font-bold text-[var(--muted)]">หน้าที่ {currentPage} จาก {totalPages}</p><div className="flex flex-wrap items-center justify-end gap-1"><PageLink disabled={currentPage===1} href={pageUrl(query,currentPage-1)} label="หน้าก่อน"><ChevronLeft size={17}/><span className="hidden sm:inline">ก่อนหน้า</span></PageLink>{pages.map((page,index)=>page===null?<span aria-hidden="true" className="grid min-h-11 min-w-8 place-items-center text-[var(--muted)]" key={`gap-${index}`}>…</span>:<Link aria-current={page===currentPage?"page":undefined} aria-label={`หน้าที่ ${page}`} className={`grid min-h-11 min-w-11 place-items-center rounded-xl px-3 text-sm font-black transition ${page===currentPage?"bg-emerald-600 text-white shadow-sm":"hover:bg-[var(--soft)]"}`} href={pageUrl(query,page)} key={page}>{page}</Link>)}<PageLink disabled={currentPage===totalPages} href={pageUrl(query,currentPage+1)} label="หน้าถัดไป"><span className="hidden sm:inline">ถัดไป</span><ChevronRight size={17}/></PageLink></div></nav>; }
function PageLink({disabled,href,label,children}:{disabled:boolean;href:string;label:string;children:React.ReactNode}) { return disabled?<span aria-disabled="true" className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold text-[var(--muted)] opacity-50">{children}</span>:<Link aria-label={label} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold transition hover:bg-[var(--soft)]" href={href}>{children}</Link>; }
function paginationRange(current:number,total:number):(number|null)[] { return paginationWindow(current,total); }
function pageUrl(query: Query, page: number) { const entries={...query,page:String(page)}; const p=new URLSearchParams(Object.entries(entries).filter(([,v])=>v) as [string,string][]); return `/assets?${p}`; }
function viewUrl(query: Query, view: string) { const p = new URLSearchParams(Object.entries({ ...query, view, page: "1" }).filter(([,v]) => v) as [string,string][]); return `/assets?${p}`; }
