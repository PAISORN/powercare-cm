import Link from "next/link";
import { Pencil, Save } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/session";
import { canManageAssets } from "../../../../modules/auth/permission";
import { recordAudit } from "../../../../modules/audit/audit-service";

async function updateAsset(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user)) redirect("/assets");
  const id = String(formData.get("assetId"));
  const asset = await db.asset.findUnique({ where: { id }, include: { plant: true } });
  if (!asset) notFound();
  if (user.role !== "ADMIN" && user.role !== "ORGANIZATION_ADMIN" && user.plantId !== asset.plantId) redirect("/assets");
  const date = (name: string) => { const value = String(formData.get(name) || ""); return value ? new Date(`${value}T00:00:00+07:00`) : null; };
  const serialNumber = optional(formData, "serialNumber");
  const before = { code: asset.code, nameTh: asset.nameTh, operatingStatus: asset.operatingStatus };
  await db.asset.update({ where: { id }, data: {
    assetClassId: String(formData.get("assetClassId")),
    assetTypeId: String(formData.get("assetTypeId") || "") || null,
    zoneId: String(formData.get("zoneId") || "") || null,
    nameTh: String(formData.get("nameTh") || formData.get("nameEn")).trim(),
    nameEn: String(formData.get("nameEn") || "").trim(), installationLocation: optional(formData, "installationLocation"),
    manufacturer: optional(formData, "manufacturer"), model: optional(formData, "model"), serialNumber,
    serialNormalized: serialNumber?.replace(/\s+/g, "").toUpperCase() || null,
    installedAt: date("installedAt"), commissionedAt: date("commissionedAt"),
    operatingStatus: String(formData.get("operatingStatus")), criticality: String(formData.get("criticality")),
  } });
  const fields = await db.assetTechnicalField.findMany({ where: { assetTypeId: String(formData.get("assetTypeId") || ""), active: true } });
  for (const field of fields) {
    const value = String(formData.get(`tech_${field.id}`) || "").trim();
    if (!value) await db.assetTechnicalValue.deleteMany({ where: { assetId: id, fieldId: field.id } });
    else await db.assetTechnicalValue.upsert({ where: { assetId_fieldId: { assetId: id, fieldId: field.id } }, update: { value, unit: field.unit, dataType: field.dataType, sortOrder: field.sortOrder }, create: { assetId: id, fieldId: field.id, value, unit: field.unit, dataType: field.dataType, sortOrder: field.sortOrder } });
  }
  await recordAudit({ actorId: user.id, organizationId: asset.plant.organizationId, plantId: asset.plantId, entityType: "Asset", entityId: id, action: "UPDATE_ASSET", before, after: { nameTh: String(formData.get("nameTh")), operatingStatus: String(formData.get("operatingStatus")) } });
  redirect(`/assets/${id}?tab=identity&updated=1`);
}

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageAssets(user)) redirect("/assets");
  const { id } = await params;
  const asset = await db.asset.findUnique({ where: { id }, include: { family: true, assetType: { include: { fields: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }, technicalValues: true } });
  if (!asset) notFound();
  if (user.role !== "ADMIN" && user.role !== "ORGANIZATION_ADMIN" && user.plantId !== asset.plantId) redirect("/assets");
  const [classes, types, zones] = await Promise.all([
    db.assetClass.findMany({ where: { plantId: asset.plantId, active: true }, orderBy: { nameTh: "asc" } }),
    db.assetType.findMany({ where: { plantId: asset.plantId, active: true }, include: { fields: { where: { active: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { code: "asc" } }),
    db.zone.findMany({ where: { plantId: asset.plantId, active: true }, orderBy: { name: "asc" } }),
  ]);
  return <AppShell>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">Edit asset</p><h1 className="mt-2 text-3xl font-black">แก้ไข Asset</h1><p className="mt-2 font-mono text-sm font-bold text-emerald-700">{asset.code}</p></div><Link href={`/assets/${asset.id}?tab=identity`} className="min-h-11 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold hover:bg-[var(--soft)]">ยกเลิกและกลับ</Link></header>
    <form action={updateAsset} className="mt-6 grid gap-5"><input type="hidden" name="assetId" value={asset.id}/>
      <Section title="ข้อมูลประจำเครื่อง" description={`Asset Family: ${asset.family.code} · รหัสเครื่องจักรไม่เปลี่ยนเมื่อแก้ไขข้อมูล`}>
        <Field label="Machine Name (English) — ชื่อหลัก"><input className={inputClass} name="nameEn" defaultValue={asset.nameEn||asset.nameTh} required/></Field><Field label="ชื่อเครื่องจักรภาษาไทย (ไม่บังคับ)"><input className={inputClass} name="nameTh" defaultValue={asset.nameEn&&asset.nameTh!==asset.nameEn?asset.nameTh:""}/></Field>
        <Field label="Asset Class"><select className={inputClass} name="assetClassId" defaultValue={asset.assetClassId}>{classes.map(x=><option key={x.id} value={x.id}>{x.nameTh}</option>)}</select></Field>
        <Field label="Asset Type"><select className={inputClass} name="assetTypeId" defaultValue={asset.assetTypeId||""}><option value="">ชุดเครื่องจักร / ยังไม่ระบุ</option>{types.map(x=><option key={x.id} value={x.id}>{x.code} — {x.nameTh}</option>)}</select></Field>
        <Field label="Zone"><select className={inputClass} name="zoneId" defaultValue={asset.zoneId||""}><option value="">ไม่ระบุ Zone</option>{zones.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="ตำแหน่งติดตั้ง"><input className={inputClass} name="installationLocation" defaultValue={asset.installationLocation||""}/></Field>
        <Field label="ผู้ผลิต"><input className={inputClass} name="manufacturer" defaultValue={asset.manufacturer||""}/></Field><Field label="รุ่น"><input className={inputClass} name="model" defaultValue={asset.model||""}/></Field><Field label="Serial Number"><input className={inputClass} name="serialNumber" defaultValue={asset.serialNumber||""}/></Field>
        <Field label="วันที่ติดตั้ง"><input className={inputClass} type="date" name="installedAt" defaultValue={dateValue(asset.installedAt)}/></Field><Field label="วันที่เริ่มใช้งาน"><input className={inputClass} type="date" name="commissionedAt" defaultValue={dateValue(asset.commissionedAt)}/></Field>
        <Field label="สถานะ"><select className={inputClass} name="operatingStatus" defaultValue={asset.operatingStatus}><option value="IN_SERVICE">ใช้งาน</option><option value="UNDER_REPAIR">ปิดซ่อม</option><option value="STANDBY">สำรอง</option><option value="TEMPORARILY_OUT">หยุดใช้งานชั่วคราว</option><option value="RETIRED">ปลดระวาง</option></select></Field>
        <Field label="Criticality"><select className={inputClass} name="criticality" defaultValue={asset.criticality}><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
      </Section>
      <Section title="ข้อมูลทางเทคนิค" description="ค่าที่แสดงอ้างอิงจาก Asset Type ที่เลือกในปัจจุบัน">
        <div className="col-span-full grid gap-3 md:grid-cols-2">{asset.assetType?.fields.length?asset.assetType.fields.map(field=>{const value=asset.technicalValues.find(item=>item.fieldId===field.id);return <Field key={field.id} label={`${field.labelTh}${field.unit?` (${field.unit})`:""}`}><input className={inputClass} name={`tech_${field.id}`} defaultValue={value?.value||""} type={field.dataType==="NUMBER"?"number":field.dataType==="DATE"?"date":"text"}/></Field>}):<p className="text-sm text-[var(--muted)]">Asset Type นี้ยังไม่มี Technical Field Template</p>}</div>
      </Section>
      <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)]/95 p-3 shadow-lg backdrop-blur"><button className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"><Save size={18}/>บันทึกการแก้ไข</button></div>
    </form>
  </AppShell>;
}

function Section({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700"><Pencil size={19}/></span><div><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-[var(--muted)]">{description}</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div></section>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="grid gap-1.5 text-sm font-bold">{label}{children}</label>}
function optional(data:FormData,key:string){return String(data.get(key)||"").trim()||null}
function dateValue(value:Date|null){return value?value.toISOString().slice(0,10):""}
const inputClass="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
