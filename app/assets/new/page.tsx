import { Check, ChevronRight, Cpu, ImagePlus, Save } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
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
  const asset = await createRegisteredAsset({
    plantId: scope.plant.id, familyId: String(formData.get("familyId")),
    assetClassId: String(formData.get("assetClassId")), assetTypeId: String(formData.get("assetTypeId") || "") || null,
    zoneId: String(formData.get("zoneId") || "") || null, parentId: String(formData.get("parentId") || "") || null,
    componentCode: String(formData.get("componentCode") || "") || null, nameTh: String(formData.get("nameTh") || formData.get("nameEn")), nameEn: String(formData.get("nameEn") || ""),
    installationLocation: String(formData.get("installationLocation") || ""), manufacturer: String(formData.get("manufacturer") || ""), model: String(formData.get("model") || ""),
    serialNumber: String(formData.get("serialNumber") || ""), installedAt: date("installedAt"), commissionedAt: date("commissionedAt"),
    operatingStatus: String(formData.get("operatingStatus") || "IN_SERVICE"), criticality: String(formData.get("criticality") || "MEDIUM"),
  });
  const fields = await db.assetTechnicalField.findMany({ where: { assetTypeId: asset.assetTypeId || "", active: true } });
  const values = fields.map(field => ({ field, value: String(formData.get(`tech_${field.id}`) || "").trim() })).filter(x => x.value);
  if (values.length) await db.assetTechnicalValue.createMany({ data: values.map(({field,value}) => ({ assetId: asset.id, fieldId: field.id, dataType: field.dataType, unit: field.unit, value, sortOrder: field.sortOrder })) });
  await recordAudit({ actorId: user.id, organizationId: scope.organization.id, plantId: scope.plant.id, entityType: "Asset", entityId: asset.id, action: "CREATE_ASSET", after: { code: asset.code, nameTh: asset.nameTh } });
  redirect(`/assets/${asset.id}?created=1`);
}

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ organizationId?: string; plantId?: string }> }) {
  const user = await requireUser();
  if (!canManageAssets(user)) redirect("/assets");
  const scope = await resolveAssetScope(user, await searchParams);
  const [families, classes, types, zones, parents] = await Promise.all([
    db.assetFamily.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { code: "asc" } }),
    db.assetClass.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { nameTh: "asc" } }),
    db.assetType.findMany({ where: { plantId: scope.plant.id, active: true }, include: { fields: { where: { active: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { code: "asc" } }),
    db.zone.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { name: "asc" } }),
    db.asset.findMany({ where: { plantId: scope.plant.id, parentId: null, registrationStatus: "ACTIVE" }, orderBy: { code: "asc" } }),
  ]);
  return <AppShell>
    <header><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">New asset</p><h1 className="mt-2 text-3xl font-black">สร้าง Asset</h1><p className="mt-2 text-sm text-[var(--muted)]">ระบบจะจองเลขและสร้างรหัสถาวรเมื่อบันทึกสำเร็จ</p></header>
    <ol className="mt-6 grid gap-2 sm:grid-cols-3">{[["1","โครงสร้างและรหัส"],["2","ข้อมูลประจำเครื่อง"],["3","ข้อมูลทางเทคนิค"]].map(([n,label],i)=><li key={n} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">{n}</span><span className="text-sm font-bold">{label}</span>{i<2?<ChevronRight className="ml-auto hidden text-[var(--muted)] sm:block" size={16}/>:<Check className="ml-auto text-emerald-600" size={16}/>}</li>)}</ol>
    <form action={createAsset} className="mt-5 grid gap-5"><AdminScopeHiddenFields scope={scope}/>
      <Section number="1" title="กำหนดโครงสร้างและรหัส" description={`Site ${scope.plant.code} ถูกกำหนดจากขอบเขตผู้ใช้`}>
        <Field label="Asset Family"><select className={inputClass} name="familyId" required><option value="">เลือก Asset Family</option>{families.map(x=><option key={x.id} value={x.id}>{x.code} — {x.nameTh}</option>)}</select></Field>
        <Field label="Asset แม่ (เว้นว่างหากสร้าง Parent)"><select className={inputClass} name="parentId"><option value="">สร้าง Parent Asset</option>{parents.map(x=><option key={x.id} value={x.id}>{x.code} — {x.nameTh}</option>)}</select></Field>
        <Field label="Component Code (เฉพาะ Child)"><input className={inputClass} name="componentCode" placeholder="PMP, MOT, PMP1" maxLength={8}/></Field>
        <Field label="Asset Class"><select className={inputClass} name="assetClassId" required><option value="">เลือก Asset Class</option>{classes.map(x=><option key={x.id} value={x.id}>{x.nameTh}</option>)}</select></Field>
        <Field label="Asset Type"><select className={inputClass} name="assetTypeId"><option value="">ชุดเครื่องจักร / ยังไม่ระบุ</option>{types.map(x=><option key={x.id} value={x.id}>{x.code} — {x.nameTh}</option>)}</select></Field>
      </Section>
      <Section number="2" title="ข้อมูลประจำเครื่อง" description="ข้อมูลหลัก รูปภาพสามารถเพิ่มได้จากหน้ารายละเอียดหลังสร้าง">
        <div className="col-span-full flex min-h-24 items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--soft)] text-sm text-[var(--muted)]"><ImagePlus size={20}/>เพิ่มรูปประจำเครื่องหลังบันทึก Asset</div>
        <Field label="Machine Name (English) — ชื่อหลัก"><input className={inputClass} name="nameEn" required placeholder="Boiler Feed Pump Set 1"/></Field><Field label="ชื่อเครื่องจักรภาษาไทย (ไม่บังคับ)"><input className={inputClass} name="nameTh" placeholder="ชุดปั๊มน้ำป้อนหม้อไอน้ำ หมายเลข 1"/></Field>
        <Field label="Zone"><select className={inputClass} name="zoneId"><option value="">ไม่ระบุ Zone</option>{zones.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="ตำแหน่งติดตั้ง"><input className={inputClass} name="installationLocation" placeholder="Bay / ชั้น / ฐานเครื่อง"/></Field>
        <Field label="ผู้ผลิต"><input className={inputClass} name="manufacturer"/></Field><Field label="รุ่น"><input className={inputClass} name="model"/></Field><Field label="Serial Number"><input className={inputClass} name="serialNumber"/></Field>
        <Field label="วันที่ติดตั้ง"><input className={inputClass} type="date" name="installedAt"/></Field><Field label="วันที่เริ่มใช้งาน"><input className={inputClass} type="date" name="commissionedAt"/></Field>
        <Field label="สถานะ"><select className={inputClass} name="operatingStatus">{[["IN_SERVICE","ใช้งาน"],["UNDER_REPAIR","ปิดซ่อม"],["STANDBY","สำรอง"],["TEMPORARILY_OUT","หยุดใช้งานชั่วคราว"],["RETIRED","ปลดระวาง"]].map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></Field>
        <Field label="Criticality"><select className={inputClass} name="criticality"><option>CRITICAL</option><option>HIGH</option><option defaultValue="MEDIUM">MEDIUM</option><option>LOW</option></select></Field>
      </Section>
      <Section number="3" title="ข้อมูลทางเทคนิค" description="ฟิลด์จริงจะอ้างอิงจาก Asset Type; หลังสร้างสามารถเพิ่ม Custom Field ได้">
        <div className="col-span-full grid gap-3 md:grid-cols-2">{types.map(type=><details key={type.id} className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4"><summary className="cursor-pointer font-bold">{type.code} · {type.nameTh} ({type.fields.length} fields)</summary><div className="mt-3 grid gap-3">{type.fields.map(field=><label key={field.id} className="grid gap-1 text-sm font-semibold">{field.labelTh}{field.unit?` (${field.unit})`:""}{field.required?<span className="text-red-600"> *</span>:null}<input className={inputClass} name={`tech_${field.id}`} type={field.dataType==="NUMBER"?"number":field.dataType==="DATE"?"date":"text"}/></label>)}</div></details>)}</div>
      </Section>
      <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)]/95 p-3 shadow-lg backdrop-blur"><button className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"><Save size={18}/>บันทึกและออกรหัส Asset</button></div>
    </form>
  </AppShell>;
}
const inputClass="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
function Section({number,title,description,children}:{number:string;title:string;description:string;children:React.ReactNode}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 font-black text-emerald-700">{number}</span><div><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-[var(--muted)]">{description}</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div></section>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="grid gap-1.5 text-sm font-bold">{label}{children}</label>}
