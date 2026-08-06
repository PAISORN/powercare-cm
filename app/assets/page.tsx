import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes, ChevronLeft, ChevronRight, CirclePlus, Download, FolderTree, Gauge, List, Search, Settings2, Upload, Wrench } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { AdminSiteScopeSelector } from "../../components/admin-site-scope-selector";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { formatThaiDate } from "../../lib/date-time/bangkok-time";
import { paginationWindow } from "../../lib/pagination-window";
import { canManageAssetMasters, canManageAssets, canViewAssets } from "../../modules/auth/permission";
import { resolveAssetScope } from "../../modules/assets/asset-scope";
import { assetStatusLabel, criticalityLabel } from "../../modules/assets/asset-service";

type Query = { organizationId?: string; plantId?: string; search?: string; zoneId?: string; status?: string; criticality?: string; view?: string; page?: string };

const PAGE_SIZE = 50;

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  if (!canViewAssets(user)) redirect("/dashboard");
  const query = await searchParams;
  const scope = await resolveAssetScope(user, query);
  const hierarchy = query.view !== "list";
  const where = {
    plantId: scope.plant.id,
    registrationStatus: "ACTIVE",
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.status ? { operatingStatus: query.status } : {}),
    ...(query.criticality ? { criticality: query.criticality } : {}),
    ...(query.search ? { OR: [
      { code: { contains: query.search } }, { nameTh: { contains: query.search } }, { nameEn: { contains: query.search } },
      { serialNumber: { contains: query.search } }, { manufacturer: { contains: query.search } }, { model: { contains: query.search } },
    ] } : {}),
  };
  const pagedWhere = hierarchy ? { ...where, parentId: null } : where;
  const filteredTotal = await db.asset.count({ where: pagedWhere });
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const requestedPage = Number.parseInt(query.page || "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const [assets, zones, total, underRepair, critical] = await Promise.all([
    db.asset.findMany({ where: pagedWhere, include: { family: true, assetType: true, zone: true, children: { include: { assetType: true }, orderBy: { componentCode: "asc" } }, cmWorks: { where: { status: "CLOSED" }, orderBy: { closedAt: "desc" }, take: 1 } }, orderBy: [{ parentId: "asc" }, { code: "asc" }], skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.zone.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { name: "asc" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE", operatingStatus: "UNDER_REPAIR" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE", criticality: "CRITICAL" } }),
  ]);
  const shown = assets;
  const firstShown = filteredTotal ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(currentPage * PAGE_SIZE, filteredTotal);
  return <AppShell>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">Asset registry</p><h1 className="mt-2 text-3xl font-black">ทะเบียนเครื่องจักรและอุปกรณ์</h1><p className="mt-2 text-sm text-[var(--muted)]">ข้อมูลกลางสำหรับเชื่อม Corrective และ Preventive Maintenance</p></div>
      <div className="flex flex-wrap gap-2"><a href={`/assets/export?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Download size={17}/>Export Excel</a>{canManageAssets(user)?<Link href={`/assets/import?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Upload size={17}/>Import Excel</Link>:null}{canManageAssetMasters(user) ? <Link href="/assets/master-data" className={secondaryButton}><Settings2 size={17}/>Master Data</Link> : null}{canManageAssets(user) ? <Link href="/assets/new" className={primaryButton}><CirclePlus size={17}/>สร้าง Asset</Link> : null}</div>
    </header>
    {scope.canSelectPlant || scope.canSelectOrganization ? <div className="mt-6"><AdminSiteScopeSelector scope={scope} title="Asset scope" description="ข้อมูลทะเบียนถูกแยกตาม Site" /></div> : null}
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <Kpi icon={Boxes} label="Assets ทั้งหมด" value={total} tone="emerald"/><Kpi icon={Wrench} label="ปิดซ่อม" value={underRepair} tone="amber"/><Kpi icon={Gauge} label="Critical" value={critical} tone="red"/>
    </section>
    <form className="mt-5 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm lg:grid-cols-[2fr_repeat(3,1fr)_auto]">
      <input type="hidden" name="organizationId" value={scope.organization.id}/><input type="hidden" name="plantId" value={scope.plant.id}/><input type="hidden" name="view" value={query.view || "tree"}/>
      <label className="relative"><Search className="absolute left-3 top-3.5 text-[var(--muted)]" size={17}/><input name="search" defaultValue={query.search} className={`${inputClass} w-full pl-10`} placeholder="ค้นหารหัส ชื่อ Serial ผู้ผลิต รุ่น"/></label>
      <select name="zoneId" defaultValue={query.zoneId} className={inputClass}><option value="">ทุก Zone</option>{zones.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select name="status" defaultValue={query.status} className={inputClass}><option value="">ทุกสถานะ</option>{["IN_SERVICE","UNDER_REPAIR","STANDBY","TEMPORARILY_OUT","RETIRED"].map(x => <option key={x} value={x}>{assetStatusLabel(x)}</option>)}</select>
      <select name="criticality" defaultValue={query.criticality} className={inputClass}><option value="">ทุก Criticality</option>{["CRITICAL","HIGH","MEDIUM","LOW"].map(x => <option key={x}>{x}</option>)}</select>
      <button className={primaryButton}>ค้นหา</button>
    </form>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">พบ {filteredTotal} รายการ · แสดง {firstShown}-{lastShown}</p><div className="flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1"><ViewLink active={!hierarchy} href={viewUrl(query, "list")} icon={List}>รายการ</ViewLink><ViewLink active={hierarchy} href={viewUrl(query, "tree")} icon={FolderTree}>โครงสร้าง</ViewLink></div></div>
    <section className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="hidden grid-cols-[minmax(260px,2fr)_1fr_1fr_1fr_1fr] gap-3 border-b border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)] md:grid"><span>Asset</span><span>Zone</span><span>Type</span><span>Status</span><span>CM / PM ล่าสุด</span></div>
      {shown.length ? shown.map(asset => <AssetRow key={asset.id} asset={asset} hierarchy={hierarchy}/>) : <div className="px-5 py-16 text-center"><Boxes className="mx-auto text-[var(--muted)]"/><h2 className="mt-3 font-bold">ยังไม่พบ Asset</h2><p className="mt-1 text-sm text-[var(--muted)]">ลองเปลี่ยนตัวกรองหรือสร้าง Asset รายการแรก</p></div>}
    </section>
    {totalPages > 1 ? <Pagination query={query} currentPage={currentPage} totalPages={totalPages}/> : null}
  </AppShell>;
}

const inputClass = "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500";
const primaryButton = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
const secondaryButton = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition hover:bg-[var(--soft)]";
function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: number; tone: "emerald"|"amber"|"red" }) { const tones={emerald:"bg-emerald-500/10 text-emerald-600",amber:"bg-amber-500/10 text-amber-600",red:"bg-red-500/10 text-red-600"}; return <div className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon size={21}/></span><div><p className="text-sm text-[var(--muted)]">{label}</p><p className="text-2xl font-black">{value}</p></div></div>; }
function ViewLink({ active, href, icon: Icon, children }: { active: boolean; href: string; icon: typeof List; children: React.ReactNode }) { return <Link href={href} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${active ? "bg-emerald-600 text-white" : "hover:bg-[var(--soft)]"}`}><Icon size={16}/>{children}</Link>; }
function AssetRow({ asset, hierarchy }: { asset: any; hierarchy: boolean }) { return <div className="border-b border-[var(--line)] last:border-0"><Link href={`/assets/${asset.id}`} className="grid gap-2 px-4 py-4 transition hover:bg-[var(--soft)] md:grid-cols-[minmax(260px,2fr)_1fr_1fr_1fr_1fr] md:items-center"><div><div className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">{asset.code}</div><div className="mt-1 font-bold">{asset.nameEn||asset.nameTh}</div><div className="text-xs text-[var(--muted)]">{asset.nameEn&&asset.nameTh!==asset.nameEn?asset.nameTh:asset.manufacturer||"-"}</div></div><div className="text-sm"><p>{asset.zone?.name || "ไม่ระบุ Zone"}</p><p className="text-xs text-[var(--muted)]">{asset.installationLocation || asset.family.nameTh}</p></div><div className="text-sm">{asset.assetType?.nameTh || "ชุดเครื่องจักร"}</div><div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold">{assetStatusLabel(asset.operatingStatus)}</span><p className="mt-2 text-xs font-bold">{criticalityLabel(asset.criticality)}</p></div><div className="text-xs text-[var(--muted)]"><p>CM: {asset.cmWorks[0]?.closedAt ? formatThaiDate(asset.cmWorks[0].closedAt) : "ยังไม่มี"}</p><p className="mt-1">PM: ยังไม่มีข้อมูล</p></div></Link>{hierarchy && asset.children.length ? <div className="bg-[var(--soft)]/60 py-2 pl-7 pr-3">{asset.children.map((child:any) => <Link key={child.id} href={`/assets/${child.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm hover:bg-[var(--surface)]"><span><span className="font-mono font-bold text-emerald-700">{child.code}</span> · {child.nameEn||child.nameTh}</span><span className="text-xs text-[var(--muted)]">{child.assetType?.nameTh}</span></Link>)}</div> : null}</div>; }
function Pagination({query,currentPage,totalPages}:{query:Query;currentPage:number;totalPages:number}) { const pages=paginationRange(currentPage,totalPages); return <nav aria-label="Asset pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm"><p className="px-1 text-sm font-bold text-[var(--muted)]">หน้าที่ {currentPage} จาก {totalPages}</p><div className="flex flex-wrap items-center justify-end gap-1"><PageLink disabled={currentPage===1} href={pageUrl(query,currentPage-1)} label="หน้าก่อน"><ChevronLeft size={17}/><span className="hidden sm:inline">ก่อนหน้า</span></PageLink>{pages.map((page,index)=>page===null?<span aria-hidden="true" className="grid min-h-11 min-w-8 place-items-center text-[var(--muted)]" key={`gap-${index}`}>…</span>:<Link aria-current={page===currentPage?"page":undefined} aria-label={`หน้าที่ ${page}`} className={`grid min-h-11 min-w-11 place-items-center rounded-xl px-3 text-sm font-black transition ${page===currentPage?"bg-emerald-600 text-white shadow-sm":"hover:bg-[var(--soft)]"}`} href={pageUrl(query,page)} key={page}>{page}</Link>)}<PageLink disabled={currentPage===totalPages} href={pageUrl(query,currentPage+1)} label="หน้าถัดไป"><span className="hidden sm:inline">ถัดไป</span><ChevronRight size={17}/></PageLink></div></nav>; }
function PageLink({disabled,href,label,children}:{disabled:boolean;href:string;label:string;children:React.ReactNode}) { return disabled?<span aria-disabled="true" className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold text-[var(--muted)] opacity-50">{children}</span>:<Link aria-label={label} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold transition hover:bg-[var(--soft)]" href={href}>{children}</Link>; }
function paginationRange(current:number,total:number):(number|null)[] { return paginationWindow(current,total); }
function pageUrl(query: Query, page: number) { const entries={...query,page:String(page)}; const p=new URLSearchParams(Object.entries(entries).filter(([,v])=>v) as [string,string][]); return `/assets?${p}`; }
function viewUrl(query: Query, view: string) { const p = new URLSearchParams(Object.entries({ ...query, view, page: "1" }).filter(([,v]) => v) as [string,string][]); return `/assets?${p}`; }
