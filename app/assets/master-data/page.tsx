import Link from "next/link";
import { Boxes, CircuitBoard, Layers3, Network, Pencil, Plus, Tags, type LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { ConfirmDeleteButton } from "../../../components/confirm-delete-button";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { resolveAdminSiteScope, adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { canManageAssetMasters } from "../../../modules/auth/permission";
import { normalizeAssetSegment, normalizeAssetTypeCode } from "../../../modules/assets/asset-service";
import { defaultAssetLevelForType, isInstrumentType, isSystemAssetType, isValidAssetSystemName } from "../../../modules/assets/asset-hierarchy";

const validTabs = ["systems", "classes", "families", "types", "fields"] as const;
type MasterTab = (typeof validTabs)[number];

function destination(scope: { organization: { id: string }; plant: { id: string } }, tab: string, result: "saved" | "deleted" | "used") {
  return `/assets/master-data?organizationId=${scope.organization.id}&plantId=${scope.plant.id}&tab=${tab}&${result}=1`;
}

async function createMaster(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));
  const kind = String(formData.get("kind"));
  const tab = String(formData.get("tab") || "classes");
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect(destination(scope, tab, "used"));
  if (kind === "system") { if (!isValidAssetSystemName(name)) redirect(destination(scope, tab, "used")); await db.assetSystem.create({ data: { plantId: scope.plant.id, code: normalizeAssetSegment(String(formData.get("code"))), nameTh: name, nameEn: null } }); }
  if (kind === "class") await db.assetClass.create({ data: { plantId: scope.plant.id, nameTh: name, nameEn: null } });
  if (kind === "family") await db.assetFamily.create({ data: { plantId: scope.plant.id, code: normalizeAssetSegment(String(formData.get("code"))), nameTh: name, nameEn: null } });
  if (kind === "type") { if (isSystemAssetType(name)) redirect(destination(scope, tab, "used")); const recommendedLevel = defaultAssetLevelForType(name); const level = recommendedLevel === "PART" ? "PART" : String(formData.get("defaultLevel") || recommendedLevel); const discipline = isInstrumentType(name) ? "Instrument" : optional(formData, "discipline"); await db.assetType.create({ data: { plantId: scope.plant.id, assetClassId: String(formData.get("assetClassId")), code: normalizeAssetTypeCode(String(formData.get("code"))), nameTh: name, nameEn: null, defaultLevel: level, discipline } }); }
  redirect(destination(scope, tab, "saved"));
}

async function createTechnicalField(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));
  const assetType = await db.assetType.findFirstOrThrow({ where: { id: String(formData.get("assetTypeId")), plantId: scope.plant.id } });
  const label = String(formData.get("label") || "").trim();
  if (!label) redirect(destination(scope, "fields", "used"));
  await db.assetTechnicalField.create({ data: {
    assetTypeId: assetType.id,
    key: normalizeAssetSegment(String(formData.get("key") || label)).toLowerCase(),
    labelTh: label,
    labelEn: null,
    dataType: String(formData.get("dataType") || "TEXT"),
    unit: optional(formData, "unit"),
    required: formData.get("required") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
  } });
  redirect(destination(scope, "fields", "saved"));
}

async function updateMaster(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  const tab = String(formData.get("tab"));
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect(destination(scope, tab, "used"));
  const common = { nameTh: name, nameEn: null, active: formData.get("active") === "on" };
  if (kind === "system") { if (!isValidAssetSystemName(name)) redirect(destination(scope, tab, "used")); await db.assetSystem.updateMany({ where: { id, plantId: scope.plant.id }, data: { ...common, code: normalizeAssetSegment(String(formData.get("code"))) } }); }
  if (kind === "class") await db.assetClass.updateMany({ where: { id, plantId: scope.plant.id }, data: common });
  if (kind === "family") await db.assetFamily.updateMany({ where: { id, plantId: scope.plant.id }, data: { ...common, code: normalizeAssetSegment(String(formData.get("code"))) } });
  if (kind === "type") { if (isSystemAssetType(name)) redirect(destination(scope, tab, "used")); const recommendedLevel = defaultAssetLevelForType(name); if (recommendedLevel === "PART" && await db.asset.count({ where: { plantId: scope.plant.id, assetTypeId: id, assetLevel: { not: "PART" } } })) redirect(destination(scope, tab, "used")); const level = recommendedLevel === "PART" ? "PART" : String(formData.get("defaultLevel") || recommendedLevel); const discipline = isInstrumentType(name) ? "Instrument" : optional(formData, "discipline"); await db.assetType.updateMany({ where: { id, plantId: scope.plant.id }, data: { ...common, code: normalizeAssetTypeCode(String(formData.get("code"))), assetClassId: String(formData.get("assetClassId")), defaultLevel: level, discipline } }); }
  redirect(destination(scope, tab, "saved"));
}

async function updateTechnicalField(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));
  const id = String(formData.get("id"));
  const field = await db.assetTechnicalField.findFirst({ where: { id, assetType: { plantId: scope.plant.id } } });
  if (!field) redirect("/assets/master-data");
  const label = String(formData.get("label") || "").trim();
  if (!label) redirect(destination(scope, "fields", "used"));
  await db.assetTechnicalField.update({ where: { id }, data: {
    key: normalizeAssetSegment(String(formData.get("key"))).toLowerCase(),
    labelTh: label,
    labelEn: null, dataType: String(formData.get("dataType")), unit: optional(formData, "unit"),
    required: formData.get("required") === "on", active: formData.get("active") === "on", sortOrder: Number(formData.get("sortOrder") || 0),
  } });
  redirect(destination(scope, "fields", "saved"));
}

async function deleteMaster(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  const tab = String(formData.get("tab"));
  let used = false;
  if (kind === "system") {
    used = (await db.assetSystem.count({ where: { id, plantId: scope.plant.id, assets: { some: {} } } })) > 0;
    if (!used) await db.assetSystem.deleteMany({ where: { id, plantId: scope.plant.id } });
  }
  if (kind === "class") {
    used = (await db.assetClass.count({ where: { id, plantId: scope.plant.id, OR: [{ assets: { some: {} } }, { types: { some: {} } }] } })) > 0;
    if (!used) await db.assetClass.deleteMany({ where: { id, plantId: scope.plant.id } });
  }
  if (kind === "family") {
    used = (await db.assetFamily.count({ where: { id, plantId: scope.plant.id, assets: { some: {} } } })) > 0;
    if (!used) await db.$transaction([db.assetSequence.deleteMany({ where: { familyId: id, plantId: scope.plant.id } }), db.assetFamily.deleteMany({ where: { id, plantId: scope.plant.id } })]);
  }
  if (kind === "type") {
    used = (await db.assetType.count({ where: { id, plantId: scope.plant.id, assets: { some: {} } } })) > 0;
    if (!used) await db.assetType.deleteMany({ where: { id, plantId: scope.plant.id } });
  }
  if (kind === "field") {
    const field = await db.assetTechnicalField.findFirst({ where: { id, assetType: { plantId: scope.plant.id } }, include: { _count: { select: { values: true } } } });
    used = !field || field._count.values > 0;
    if (!used) await db.assetTechnicalField.delete({ where: { id } });
  }
  redirect(destination(scope, tab, used ? "used" : "deleted"));
}

export default async function AssetMasterDataPage({ searchParams }: { searchParams: Promise<{ organizationId?: string; plantId?: string; tab?: string; saved?: string; deleted?: string; used?: string }> }) {
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const query = await searchParams;
  const scope = await resolveAdminSiteScope(user, query);
  const tab: MasterTab = validTabs.includes(query.tab as MasterTab) ? query.tab as MasterTab : "classes";
  const [systems, classes, types, families] = await Promise.all([
    db.assetSystem.findMany({ where: { plantId: scope.plant.id }, include: { _count: { select: { assets: true } } }, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    db.assetClass.findMany({ where: { plantId: scope.plant.id }, include: { _count: { select: { assets: true, types: true } } }, orderBy: { nameTh: "asc" } }),
    db.assetType.findMany({ where: { plantId: scope.plant.id }, include: { assetClass: true, fields: { include: { _count: { select: { values: true } } }, orderBy: { sortOrder: "asc" } }, _count: { select: { assets: true } } }, orderBy: { code: "asc" } }),
    db.assetFamily.findMany({ where: { plantId: scope.plant.id }, include: { _count: { select: { assets: true } } }, orderBy: { code: "asc" } }),
  ]);
  const scopeQuery = `organizationId=${scope.organization.id}&plantId=${scope.plant.id}`;
  const tabs: { id: MasterTab; label: string; icon: LucideIcon; count: number }[] = [
    { id: "systems", label: "Systems", icon: Network, count: systems.length },
    { id: "classes", label: "Asset Classes", icon: Layers3, count: classes.length },
    { id: "families", label: "Asset Families", icon: Boxes, count: families.length },
    { id: "types", label: "Asset Types", icon: Tags, count: types.length },
    { id: "fields", label: "Technical Field Templates", icon: CircuitBoard, count: types.reduce((sum, item) => sum + item.fields.length, 0) },
  ];
  return <AppShell>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">Assets configuration</p><h1 className="mt-2 text-3xl font-black">Asset Master Data</h1><p className="mt-2 text-sm text-[var(--muted)]">กำหนดหมวดหมู่ รหัส และแม่แบบข้อมูลทางเทคนิคแยกตาม Site</p></div><Link className="min-h-11 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold hover:bg-[var(--soft)]" href="/assets">กลับทะเบียน Assets</Link></header>
    <div className="mt-6"><AdminSiteScopeSelector scope={scope} title="Asset master scope" description="Master Data ทุกชุดแยกตาม Site" /></div>
    {query.saved?<Notice tone="success">บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว</Notice>:null}
    {query.deleted?<Notice tone="success">ลบรายการเรียบร้อยแล้ว</Notice>:null}
    {query.used?<Notice tone="danger">ไม่สามารถลบรายการนี้ได้ เนื่องจากมี Assets หรือข้อมูลอื่นใช้งานอยู่</Notice>:null}
    <nav aria-label="Asset Master Data tabs" className="mt-6 flex border-b border-[var(--line)]">{tabs.map(item=>{const Icon=item.icon;return <Link key={item.id} href={`/assets/master-data?${scopeQuery}&tab=${item.id}`} aria-label={`${item.label} (${item.count} รายการ)`} title={item.label} aria-current={tab===item.id?"page":undefined} className={`flex min-h-12 flex-1 items-center justify-center gap-2 border-b-2 px-3 text-sm font-bold transition md:flex-none md:px-4 ${tab===item.id?"border-emerald-600 text-emerald-700":"border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--ink)]"}`}><Icon size={20}/><span className="hidden md:inline">{item.label}</span><span className="hidden rounded-full bg-[var(--soft)] px-2 py-0.5 text-xs md:inline">{item.count}</span></Link>})}</nav>
    <section className="mt-5">
      {tab==="systems"?<MasterPanel icon={Network} title="Systems" description="ระบบกระบวนการของ Site แยกจาก Area / Zone"><SimpleCreate scope={scope} kind="system" tab="systems" withCode/><div className="mt-5 grid gap-3">{systems.map(item=><EditableMaster key={item.id} scope={scope} kind="system" tab="systems" id={item.id} code={item.code} eyebrow={item.code} title={preferredName(item.nameTh,item.nameEn)||"Untitled system"} subtitle={`${item._count.assets} Assets`} active={item.active} nameTh={item.nameTh} nameEn={item.nameEn}/>)}</div></MasterPanel>:null}
      {tab==="classes"?<MasterPanel icon={Layers3} title="Asset Classes" description="กลุ่มหลัก เช่น เครื่องจักรหนัก ยานยนต์ และเครื่องมือวัด"><SimpleCreate scope={scope} kind="class" tab="classes"/><div className="mt-5 grid gap-3">{classes.map(item=><EditableMaster key={item.id} scope={scope} kind="class" tab="classes" id={item.id} title={preferredName(item.nameTh,item.nameEn)||"Untitled class"} subtitle={`${item._count.assets} Assets · ${item._count.types} Types`} active={item.active} nameTh={item.nameTh} nameEn={item.nameEn}/>)}</div></MasterPanel>:null}
      {tab==="families"?<MasterPanel icon={Boxes} title="Asset Families" description="ตระกูลเครื่องจักรและส่วนประกอบรหัส เช่น BFP"><SimpleCreate scope={scope} kind="family" tab="families" withCode/><div className="mt-5 grid gap-3">{families.map(item=><EditableMaster key={item.id} scope={scope} kind="family" tab="families" id={item.id} code={item.code} eyebrow={item.code} title={preferredName(item.nameTh,item.nameEn)||"Untitled family"} subtitle={`${item._count.assets} Assets`} active={item.active} nameTh={item.nameTh} nameEn={item.nameEn}/>)}</div></MasterPanel>:null}
      {tab==="types"?<MasterPanel icon={Tags} title="Asset Types" description="ประเภทอุปกรณ์และ Type Code เช่น PMP, MOT"><TypeCreate scope={scope} classes={classes}/><div className="mt-5 grid gap-3">{types.map(item=><EditableType key={item.id} scope={scope} item={item} classes={classes}/>)}</div></MasterPanel>:null}
      {tab==="fields"?<MasterPanel icon={CircuitBoard} title="Technical Field Templates" description="ฟิลด์มาตรฐานสำหรับข้อมูลทางเทคนิคของแต่ละ Asset Type"><FieldCreate scope={scope} types={types}/><div className="mt-5 grid gap-4">{types.map(type=><div key={type.id} className="rounded-xl border border-[var(--line)] p-4"><p className="font-mono text-xs font-black uppercase tracking-wider text-emerald-700">{type.code}</p><h3 className="mt-1 text-lg font-black">{preferredName(type.nameTh,type.nameEn)}</h3><div className="mt-3 grid gap-3">{type.fields.length?type.fields.map(field=><EditableField key={field.id} scope={scope} field={field}/>):<p className="rounded-xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)]">ยังไม่มี Technical Field</p>}</div></div>)}</div></MasterPanel>:null}
    </section>
  </AppShell>;
}

function ScopeFields({ scope }: { scope: Awaited<ReturnType<typeof resolveAdminSiteScope>> }) { return <AdminScopeHiddenFields scope={scope}/>; }
function SimpleCreate({scope,kind,tab,withCode=false}:{scope:Awaited<ReturnType<typeof resolveAdminSiteScope>>;kind:string;tab:string;withCode?:boolean}){return <form action={createMaster} className={`grid gap-2 ${withCode?"md:grid-cols-3":"md:grid-cols-2"}`}><ScopeFields scope={scope}/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="tab" value={tab}/>{withCode?<input className={inputClass} name="code" required placeholder="รหัส เช่น BFP"/>:null}<input aria-label="ชื่อ (ไทยหรืออังกฤษ)" className={inputClass} name="name" required placeholder="ชื่อ (ไทยหรืออังกฤษ)"/><button className={buttonClass}><Plus size={16}/>เพิ่มรายการ</button></form>}
function TypeCreate({scope,classes}:{scope:Awaited<ReturnType<typeof resolveAdminSiteScope>>;classes:{id:string;nameTh:string;nameEn:string|null}[]}){return <form action={createMaster} className="grid gap-2 md:grid-cols-3 xl:grid-cols-6"><ScopeFields scope={scope}/><input type="hidden" name="kind" value="type"/><input type="hidden" name="tab" value="types"/><select required name="assetClassId" className={inputClass}><option value="">เลือก Asset Class</option>{classes.map(x=><option key={x.id} value={x.id}>{preferredName(x.nameTh,x.nameEn)}</option>)}</select><input className={inputClass} name="code" required placeholder="รหัส เช่น MOT"/><input aria-label="ชื่อ (ไทยหรืออังกฤษ)" className={inputClass} name="name" required placeholder="ชื่ออุปกรณ์ เช่น Motor"/><select aria-label="Default Asset Level" name="defaultLevel" className={inputClass}><LevelOptions/></select><input aria-label="Discipline" className={inputClass} name="discipline" placeholder="Mechanical / Electrical"/><button className={buttonClass}><Plus size={16}/>เพิ่ม Asset Type</button></form>}
function FieldCreate({scope,types}:{scope:Awaited<ReturnType<typeof resolveAdminSiteScope>>;types:{id:string;code:string;nameTh:string;nameEn:string|null}[]}){return <form action={createTechnicalField} className="grid gap-2 md:grid-cols-4"><ScopeFields scope={scope}/><select className={inputClass} name="assetTypeId" required><option value="">เลือก Asset Type</option>{types.map(x=><option key={x.id} value={x.id}>{x.code} — {preferredName(x.nameTh,x.nameEn)}</option>)}</select><input className={inputClass} name="key" required placeholder="rated_power"/><input aria-label="ชื่อฟิลด์ (ไทยหรืออังกฤษ)" className={inputClass} name="label" required placeholder="ชื่อฟิลด์ (ไทยหรืออังกฤษ)"/><select className={inputClass} name="dataType"><DataTypeOptions/></select><input className={inputClass} name="unit" placeholder="หน่วย เช่น kW"/><input className={inputClass} type="number" name="sortOrder" defaultValue="0"/><Check name="required" label="บังคับกรอก"/><button className={buttonClass}><Plus size={16}/>เพิ่ม Technical Field</button></form>}
function EditableMaster({scope,kind,tab,id,code,eyebrow,title,subtitle,active,nameTh,nameEn}:{scope:Awaited<ReturnType<typeof resolveAdminSiteScope>>;kind:string;tab:string;id:string;code?:string;eyebrow?:string;title:string;subtitle:string;active:boolean;nameTh:string;nameEn:string|null}){return <EditRow eyebrow={eyebrow} title={title} subtitle={subtitle} active={active}><form action={updateMaster} className="grid gap-2 md:grid-cols-4"><ScopeFields scope={scope}/><Hidden kind={kind} tab={tab} id={id}/>{code!==undefined?<input className={inputClass} name="code" defaultValue={code} required/>:null}<input aria-label="ชื่อ (ไทยหรืออังกฤษ)" className={inputClass} name="name" defaultValue={preferredName(nameTh,nameEn)} required/><Check name="active" label="เปิดใช้งาน" defaultChecked={active}/><button className={saveButton}><Pencil size={16}/>บันทึก</button></form><DeleteForm scope={scope} kind={kind} tab={tab} id={id} label={title}/></EditRow>}
function EditableType({scope,item,classes}:{scope:Awaited<ReturnType<typeof resolveAdminSiteScope>>;item:{id:string;code:string;nameTh:string;nameEn:string|null;active:boolean;assetClassId:string;defaultLevel:string|null;discipline:string|null;assetClass:{nameTh:string;nameEn:string|null};fields:unknown[];_count:{assets:number}};classes:{id:string;nameTh:string;nameEn:string|null}[]}){return <EditRow eyebrow={item.code} title={preferredName(item.nameTh,item.nameEn)||"Untitled type"} subtitle={`${item.defaultLevel||"ยังไม่กำหนดระดับ"} · ${item.discipline||"ยังไม่กำหนด Discipline"} · ${item.fields.length} fields · ${item._count.assets} Assets`} active={item.active}><form action={updateMaster} className="grid gap-2 md:grid-cols-3 xl:grid-cols-7"><ScopeFields scope={scope}/><Hidden kind="type" tab="types" id={item.id}/><select name="assetClassId" className={inputClass} defaultValue={item.assetClassId}>{classes.map(x=><option key={x.id} value={x.id}>{preferredName(x.nameTh,x.nameEn)}</option>)}</select><input className={inputClass} name="code" defaultValue={item.code} required/><input aria-label="ชื่อ (ไทยหรืออังกฤษ)" className={inputClass} name="name" defaultValue={preferredName(item.nameTh,item.nameEn)} required/><select aria-label="Default Asset Level" name="defaultLevel" className={inputClass} defaultValue={item.defaultLevel||defaultAssetLevelForType(item.nameEn||item.nameTh)}><LevelOptions/></select><input aria-label="Discipline" className={inputClass} name="discipline" defaultValue={item.discipline||""}/><Check name="active" label="เปิดใช้งาน" defaultChecked={item.active}/><button className={saveButton}><Pencil size={16}/>บันทึก</button></form><DeleteForm scope={scope} kind="type" tab="types" id={item.id} label={`${item.code} · ${preferredName(item.nameTh,item.nameEn)}`}/></EditRow>}
function EditableField({scope,field}:{scope:Awaited<ReturnType<typeof resolveAdminSiteScope>>;field:{id:string;key:string;labelTh:string;labelEn:string|null;dataType:string;unit:string|null;required:boolean;active:boolean;sortOrder:number;_count:{values:number}}}){return <EditRow eyebrow={field.key} title={preferredName(field.labelTh,field.labelEn)||"Untitled field"} subtitle={`${field.dataType}${field.unit?` · ${field.unit}`:""} · ใช้งาน ${field._count.values} ค่า`} active={field.active}><form action={updateTechnicalField} className="grid gap-2 md:grid-cols-4"><ScopeFields scope={scope}/><input type="hidden" name="id" value={field.id}/><input className={inputClass} name="key" defaultValue={field.key} required/><input aria-label="ชื่อฟิลด์ (ไทยหรืออังกฤษ)" className={inputClass} name="label" defaultValue={preferredName(field.labelTh,field.labelEn)} required/><select className={inputClass} name="dataType" defaultValue={field.dataType}><DataTypeOptions/></select><input className={inputClass} name="unit" defaultValue={field.unit||""} placeholder="หน่วย"/><input className={inputClass} type="number" name="sortOrder" defaultValue={field.sortOrder}/><Check name="required" label="บังคับกรอก" defaultChecked={field.required}/><Check name="active" label="เปิดใช้งาน" defaultChecked={field.active}/><button className={saveButton}><Pencil size={16}/>บันทึก</button></form><DeleteForm scope={scope} kind="field" tab="fields" id={field.id} label={preferredName(field.labelTh,field.labelEn)}/></EditRow>}
function EditRow({eyebrow,title,subtitle,active,children}:{eyebrow?:string;title:string;subtitle:string;active:boolean;children:React.ReactNode}){return <details className="group rounded-xl border border-[var(--line)] bg-[var(--surface)]"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 transition hover:bg-[var(--soft)]"><div className="min-w-0">{eyebrow?<p className="font-mono text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{eyebrow}</p>:null}<p className={`${eyebrow?"mt-0.5":""} truncate text-base font-black text-[var(--ink)]`}>{title}</p><p className="mt-0.5 text-xs font-medium text-[var(--muted)]">{subtitle}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${active?"bg-emerald-500/10 text-emerald-700":"bg-slate-500/10 text-[var(--muted)]"}`}>{active?"Active":"Inactive"}</span></summary><div className="grid gap-3 border-t border-[var(--line)] p-4">{children}</div></details>}
function DeleteForm({scope,kind,tab,id,label}:{scope:Awaited<ReturnType<typeof resolveAdminSiteScope>>;kind:string;tab:string;id:string;label:string}){return <form action={deleteMaster} className="flex justify-end"><ScopeFields scope={scope}/><Hidden kind={kind} tab={tab} id={id}/><ConfirmDeleteButton label={label}/></form>}
function Hidden({kind,tab,id}:{kind:string;tab:string;id:string}){return <><input type="hidden" name="kind" value={kind}/><input type="hidden" name="tab" value={tab}/><input type="hidden" name="id" value={id}/></>}
function Check({name,label,defaultChecked=false}:{name:string;label:string;defaultChecked?:boolean}){return <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm"><input type="checkbox" name={name} defaultChecked={defaultChecked}/>{label}</label>}
function DataTypeOptions(){return <><option value="TEXT">ข้อความ</option><option value="NUMBER">ตัวเลข</option><option value="DATE">วันที่</option><option value="BOOLEAN">ใช่/ไม่ใช่</option></>}
function LevelOptions(){return <><option value="MAIN_ASSET">Main Asset</option><option value="SUB_ASSET">Sub-Asset</option><option value="PART">Part</option></>}
function MasterPanel({icon:Icon,title,description,children}:{icon:LucideIcon;title:string;description:string;children:React.ReactNode}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><Icon size={20}/></span><div><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-[var(--muted)]">{description}</p></div></div>{children}</section>}
function Notice({tone,children}:{tone:"success"|"danger";children:React.ReactNode}){return <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${tone==="success"?"border-emerald-500/30 bg-emerald-500/10 text-emerald-700":"border-red-500/30 bg-red-500/10 text-red-700"}`}>{children}</p>}
function preferredName(primaryName:string,alternateName:string|null){return alternateName?.trim()||primaryName.trim()}
function optional(formData:FormData,key:string){return String(formData.get(key)||"").trim()||null}
const inputClass="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
const buttonClass="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
const saveButton="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-500/10";
