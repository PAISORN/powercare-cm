import { Check, ChevronRight, ImagePlus, Save } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AssetHierarchyFields } from "../../../components/asset-hierarchy-fields";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { canManageAssets } from "../../../modules/auth/permission";
import { resolveAssetScope } from "../../../modules/assets/asset-scope";
import { createRegisteredAsset } from "../../../modules/assets/asset-service";
import { recordAudit } from "../../../modules/audit/audit-service";

async function createAsset(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user)) redirect("/assets");
  const scope = await resolveAssetScope(user, adminScopeSearchFromFormData(formData));
  const date = (name: string) => { const value = String(formData.get(name) || ""); return value ? new Date(`${value}T00:00:00+07:00`) : null; };
  let asset;
  let error = "";
  try {
    asset = await createRegisteredAsset({
      plantId: scope.plant.id,
      systemId: required(formData, "systemId"),
      assetTypeId: required(formData, "assetTypeId"),
      assetLevel: required(formData, "assetLevel"),
      parentId: optional(formData, "parentId"),
      familyId: optional(formData, "familyId"),
      assetClassId: optional(formData, "assetClassId"),
      zoneId: optional(formData, "zoneId"),
      nameTh: String(formData.get("nameTh") || formData.get("nameEn")).trim(),
      nameEn: optional(formData, "nameEn"),
      discipline: optional(formData, "discipline"),
      tagKks: optional(formData, "tagKks"),
      registrationCode: optional(formData, "registrationCode"),
      keySpecification: optional(formData, "keySpecification"),
      installationLocation: optional(formData, "installationLocation"),
      manufacturer: optional(formData, "manufacturer"),
      model: optional(formData, "model"),
      serialNumber: optional(formData, "serialNumber"),
      installedAt: date("installedAt"), commissionedAt: date("commissionedAt"),
      operatingStatus: required(formData, "operatingStatus"), criticality: required(formData, "criticality"),
    });
    const fields = await db.assetTechnicalField.findMany({ where: { assetTypeId: asset.assetTypeId || "", active: true } });
    const values = fields.map(field => ({ field, value: String(formData.get(`tech_${field.id}`) || "").trim() }));
    const missing = values.find(item => item.field.required && !item.value);
    if (missing) throw new Error(`กรุณาระบุ ${missing.field.labelTh}`);
    const present = values.filter(item => item.value);
    if (present.length) await db.assetTechnicalValue.createMany({ data: present.map(({field,value}) => ({ assetId: asset!.id, fieldId: field.id, dataType: field.dataType, unit: field.unit, value, sortOrder: field.sortOrder })) });
    await recordAudit({ actorId: user.id, organizationId: scope.organization.id, plantId: scope.plant.id, entityType: "Asset", entityId: asset.id, action: "CREATE_ASSET", after: { code: asset.code, nameTh: asset.nameTh, assetLevel: asset.assetLevel, systemId: asset.systemId, parentId: asset.parentId } });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "สร้าง Asset ไม่สำเร็จ";
  }
  if (error) redirect(`/assets/new?organizationId=${scope.organization.id}&plantId=${scope.plant.id}&error=${encodeURIComponent(error)}`);
  redirect(`/assets/${asset!.id}?created=1`);
}

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ organizationId?: string; plantId?: string; error?: string }> }) {
  const user = await requireUser();
  if (!canManageAssets(user)) redirect("/assets");
  const query = await searchParams;
  const scope = await resolveAssetScope(user, query);
  const [families, classes, types, zones, systems, parents] = await Promise.all([
    db.assetFamily.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { code: "asc" } }),
    db.assetClass.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { nameTh: "asc" } }),
    db.assetType.findMany({ where: { plantId: scope.plant.id, active: true }, include: { fields: { where: { active: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { code: "asc" } }),
    db.zone.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { name: "asc" } }),
    db.assetSystem.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    db.asset.findMany({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE" }, orderBy: { code: "asc" }, select: { id: true, code: true, nameTh: true, nameEn: true, parentId: true, systemId: true, assetLevel: true, plantId: true, migrationStatus: true } }),
  ]);
  return <AppShell>
    <header><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">New asset</p><h1 className="mt-2 text-3xl font-black">สร้าง Asset</h1><p className="mt-2 text-sm text-[var(--muted)]">ระบบสร้าง Asset Code ตามมาตรฐาน MC-XXX-001 และตรวจความสัมพันธ์ก่อนบันทึก</p></header>
    {query.error ? <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">{query.error}</p> : null}
    <ol className="mt-6 grid gap-2 sm:grid-cols-3">{[["1","โครงสร้างและรหัส"],["2","ข้อมูลประจำเครื่อง"],["3","ข้อมูลทางเทคนิค"]].map(([n,label],i)=><li key={n} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">{n}</span><span className="text-sm font-bold">{label}</span>{i<2?<ChevronRight className="ml-auto hidden text-[var(--muted)] sm:block" size={16}/>:<Check className="ml-auto text-emerald-600" size={16}/>}</li>)}</ol>
    <form action={createAsset} className="mt-5 grid gap-5"><AdminScopeHiddenFields scope={scope}/>
      <Section number="1" title="กำหนดโครงสร้างและรหัส" description={`Site ${scope.plant.code} ถูกกำหนดจากขอบเขตผู้ใช้`}>
        <AssetHierarchyFields plantId={scope.plant.id} systems={systems.map(item => ({ id: item.id, code: item.code, name: item.nameEn || item.nameTh }))} types={types} parents={parents}/>
        <Field label="Area / Zone"><select className={inputClass} name="zoneId"><option value="">ไม่ระบุ Area / Zone</option>{zones.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Asset Family (ข้อมูลเดิม ไม่บังคับ)"><select className={inputClass} name="familyId"><option value="">ไม่ระบุ</option>{families.map(x=><option key={x.id} value={x.id}>{x.code} — {x.nameTh}</option>)}</select></Field>
        <Field label="Asset Class (ข้อมูลเดิม ไม่บังคับ)"><select className={inputClass} name="assetClassId"><option value="">ไม่ระบุ</option>{classes.map(x=><option key={x.id} value={x.id}>{x.nameTh}</option>)}</select></Field>
      </Section>
      <Section number="2" title="ข้อมูลประจำเครื่อง" description="ชื่อ Asset ต้องไม่ลงท้ายด้วย Zone code">
        <div className="col-span-full flex min-h-24 items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--soft)] text-sm text-[var(--muted)]"><ImagePlus size={20}/>เพิ่มรูปประจำเครื่องหลังบันทึก Asset</div>
        <Field label="Asset Name"><input className={inputClass} name="nameTh" required placeholder="Boiler Feed Pump Set 1"/></Field>
        <Field label="English Name (ไม่บังคับ)"><input className={inputClass} name="nameEn"/></Field>
        <Field label="ตำแหน่งติดตั้ง"><input className={inputClass} name="installationLocation" placeholder="Bay / ชั้น / ฐานเครื่อง"/></Field>
        <Field label="ผู้ผลิต"><input className={inputClass} name="manufacturer"/></Field><Field label="รุ่น"><input className={inputClass} name="model"/></Field><Field label="Serial Number"><input className={inputClass} name="serialNumber"/></Field>
        <Field label="วันที่ติดตั้ง"><input className={inputClass} type="date" name="installedAt"/></Field><Field label="วันที่เริ่มใช้งาน"><input className={inputClass} type="date" name="commissionedAt"/></Field>
        <Field label="สถานะ"><select className={inputClass} name="operatingStatus">{[["IN_SERVICE","ใช้งาน"],["UNDER_REPAIR","ปิดซ่อม"],["STANDBY","สำรอง"],["TEMPORARILY_OUT","หยุดใช้งานชั่วคราว"],["RETIRED","ปลดระวาง"]].map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></Field>
        <Field label="Criticality"><select className={inputClass} name="criticality" defaultValue="MEDIUM"><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
      </Section>
      <Section number="3" title="ข้อมูลทางเทคนิค" description="กรอกกลุ่มข้อมูลของ Asset Type ที่เลือก">
        <div className="col-span-full grid gap-3 md:grid-cols-2">{types.map(type=><details key={type.id} className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4"><summary className="cursor-pointer font-bold">{type.code} · {type.nameEn || type.nameTh} ({type.fields.length} fields)</summary><div className="mt-3 grid gap-3">{type.fields.map(field=><label key={field.id} className="grid gap-1 text-sm font-semibold">{field.labelTh}{field.unit?` (${field.unit})`:""}{field.required?<span className="text-red-600"> *</span>:null}<input className={inputClass} name={`tech_${field.id}`} type={field.dataType==="NUMBER"?"number":field.dataType==="DATE"?"date":"text"}/></label>)}</div></details>)}</div>
      </Section>
      <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)]/95 p-3 shadow-lg backdrop-blur"><button className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"><Save size={18}/>บันทึก Asset</button></div>
    </form>
  </AppShell>;
}
const inputClass="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
function Section({number,title,description,children}:{number:string;title:string;description:string;children:React.ReactNode}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 font-black text-emerald-700">{number}</span><div><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-[var(--muted)]">{description}</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div></section>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="grid gap-1.5 text-sm font-bold">{label}{children}</label>}
function optional(data:FormData,key:string){return String(data.get(key)||"").trim()||null}
function required(data:FormData,key:string){return String(data.get(key)||"").trim()}
