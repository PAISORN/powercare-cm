import Link from "next/link";
import { Pencil, Save } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { AssetHierarchyFields } from "../../../../components/asset-hierarchy-fields";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/session";
import { canManageAssets, canRecodeAssets } from "../../../../modules/auth/permission";
import { updateRegisteredAsset } from "../../../../modules/assets/asset-service";
import { recordAudit } from "../../../../modules/audit/audit-service";
import { buildUserOperationalScope } from "../../../../modules/organization/user-plant-scope";

async function updateAsset(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user)) redirect("/assets");
  const id = String(formData.get("assetId"));
  const asset = await db.asset.findFirst({ where: { id, ...buildUserOperationalScope(user) }, include: { plant: true } });
  if (!asset) notFound();
  const typeId = required(formData, "assetTypeId");
  const fields = await db.assetTechnicalField.findMany({ where: { assetTypeId: typeId, active: true } });
  const values = fields.map(field => ({ field, value: String(formData.get(`tech_${field.id}`) || "").trim() }));
  const missing = values.find(item => item.field.required && !item.value);
  let error = missing ? `กรุณาระบุ ${missing.field.labelTh}` : "";
  const submittedCode = required(formData, "code");
  const effectiveCode = canRecodeAssets(user) ? submittedCode : asset.code;
  if (!error && !effectiveCode) error = "กรุณาระบุ Asset Code";
  const date = (name: string) => { const value = String(formData.get(name) || ""); return value ? new Date(`${value}T00:00:00+07:00`) : null; };
  let updated;
  if (!error) {
    try {
      updated = await updateRegisteredAsset(id, {
        plantId: asset.plantId, code: effectiveCode, systemId: required(formData, "systemId"), assetTypeId: typeId,
        assetLevel: required(formData, "assetLevel"), parentId: optional(formData, "parentId"),
        familyId: optional(formData, "familyId"), assetClassId: optional(formData, "assetClassId"), zoneId: optional(formData, "zoneId"),
        nameTh: String(formData.get("nameTh") || formData.get("nameEn")).trim(), nameEn: optional(formData, "nameEn"),
        discipline: optional(formData, "discipline"), tagKks: optional(formData, "tagKks"), registrationCode: optional(formData, "registrationCode"),
        keySpecification: optional(formData, "keySpecification"), metadataJson: asset.metadataJson,
        installationLocation: optional(formData, "installationLocation"), manufacturer: optional(formData, "manufacturer"), model: optional(formData, "model"), serialNumber: optional(formData, "serialNumber"),
        installedAt: date("installedAt"), commissionedAt: date("commissionedAt"), operatingStatus: required(formData, "operatingStatus"), criticality: required(formData, "criticality"),
      });
      for (const item of values) {
        if (!item.value) await db.assetTechnicalValue.deleteMany({ where: { assetId: id, fieldId: item.field.id } });
        else await db.assetTechnicalValue.upsert({ where: { assetId_fieldId: { assetId: id, fieldId: item.field.id } }, update: { value: item.value, unit: item.field.unit, dataType: item.field.dataType, sortOrder: item.field.sortOrder }, create: { assetId: id, fieldId: item.field.id, value: item.value, unit: item.field.unit, dataType: item.field.dataType, sortOrder: item.field.sortOrder } });
      }
      await recordAudit({ actorId: user.id, organizationId: asset.plant.organizationId, plantId: asset.plantId, entityType: "Asset", entityId: id, action: asset.code !== updated.code ? "RECODE_ASSET" : "UPDATE_ASSET", before: { code: asset.code, nameTh: asset.nameTh, assetLevel: asset.assetLevel, systemId: asset.systemId, parentId: asset.parentId }, after: { code: updated.code, nameTh: updated.nameTh, assetLevel: updated.assetLevel, systemId: updated.systemId, parentId: updated.parentId } });
    } catch (caught) { error = caught instanceof Error ? caught.message : "บันทึก Asset ไม่สำเร็จ"; }
  }
  if (error) redirect(`/assets/${id}/edit?error=${encodeURIComponent(error)}`);
  redirect(`/assets/${id}?tab=identity&updated=1`);
}

export default async function EditAssetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  if (!canManageAssets(user)) redirect("/assets");
  const { id } = await params;
  const query = await searchParams;
  const asset = await db.asset.findFirst({ where: { id, ...buildUserOperationalScope(user) }, include: { family: true, assetType: { include: { fields: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }, technicalValues: true } });
  if (!asset) notFound();
  const [classes, types, zones, systems, parents] = await Promise.all([
    db.assetClass.findMany({ where: { plantId: asset.plantId, active: true }, orderBy: { nameTh: "asc" } }),
    db.assetType.findMany({ where: { plantId: asset.plantId, active: true }, include: { fields: { where: { active: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { code: "asc" } }),
    db.zone.findMany({ where: { plantId: asset.plantId, active: true }, orderBy: { name: "asc" } }),
    db.assetSystem.findMany({ where: { plantId: asset.plantId, active: true }, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    db.asset.findMany({ where: { plantId: asset.plantId, registrationStatus: "ACTIVE" }, orderBy: { code: "asc" }, select: { id: true, code: true, nameTh: true, nameEn: true, parentId: true, systemId: true, assetLevel: true, plantId: true, migrationStatus: true } }),
  ]);
  const families = await db.assetFamily.findMany({ where: { plantId: asset.plantId, active: true }, orderBy: { code: "asc" } });
  return <AppShell>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">Edit asset</p><h1 className="mt-2 text-3xl font-black">แก้ไข Asset</h1><p className="mt-2 font-mono text-sm font-bold text-emerald-700">{asset.code}</p></div><Link href={`/assets/${asset.id}?tab=identity`} className="min-h-11 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold hover:bg-[var(--soft)]">ยกเลิกและกลับ</Link></header>
    {query.error ? <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">{query.error}</p> : null}
    <form action={updateAsset} className="mt-6 grid gap-5"><input type="hidden" name="assetId" value={asset.id}/>
      <Section title="โครงสร้างและข้อมูลประจำเครื่อง" description="การเปลี่ยน System, Level หรือ Parent จะตรวจผลกระทบกับอุปกรณ์ลูกด้วย">
        <AssetHierarchyFields plantId={asset.plantId} systems={systems.map(item => ({ id: item.id, code: item.code, name: item.nameEn || item.nameTh }))} types={types} parents={parents} canEditCode={canRecodeAssets(user)} asset={{ id: asset.id, code: asset.code || "", systemId: asset.systemId, assetLevel: asset.assetLevel, parentId: asset.parentId, assetTypeId: asset.assetTypeId, discipline: asset.discipline, tagKks: asset.tagKks, registrationCode: asset.registrationCode, keySpecification: asset.keySpecification }}/>
        <Field label="Asset Name"><input className={inputClass} name="nameTh" defaultValue={asset.nameTh} required/></Field>
        <Field label="English Name (ไม่บังคับ)"><input className={inputClass} name="nameEn" defaultValue={asset.nameEn || ""}/></Field>
        <Field label="Area / Zone"><select className={inputClass} name="zoneId" defaultValue={asset.zoneId || ""}><option value="">ไม่ระบุ</option>{zones.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Asset Family (ข้อมูลเดิม ไม่บังคับ)"><select className={inputClass} name="familyId" defaultValue={asset.familyId || ""}><option value="">ไม่ระบุ</option>{families.map(x=><option key={x.id} value={x.id}>{x.code} — {x.nameTh}</option>)}</select></Field>
        <Field label="Asset Class (ข้อมูลเดิม ไม่บังคับ)"><select className={inputClass} name="assetClassId" defaultValue={asset.assetClassId || ""}><option value="">ไม่ระบุ</option>{classes.map(x=><option key={x.id} value={x.id}>{x.nameTh}</option>)}</select></Field>
        <Field label="ตำแหน่งติดตั้ง"><input className={inputClass} name="installationLocation" defaultValue={asset.installationLocation || ""}/></Field>
        <Field label="ผู้ผลิต"><input className={inputClass} name="manufacturer" defaultValue={asset.manufacturer || ""}/></Field><Field label="รุ่น"><input className={inputClass} name="model" defaultValue={asset.model || ""}/></Field><Field label="Serial Number"><input className={inputClass} name="serialNumber" defaultValue={asset.serialNumber || ""}/></Field>
        <Field label="วันที่ติดตั้ง"><input className={inputClass} type="date" name="installedAt" defaultValue={dateValue(asset.installedAt)}/></Field><Field label="วันที่เริ่มใช้งาน"><input className={inputClass} type="date" name="commissionedAt" defaultValue={dateValue(asset.commissionedAt)}/></Field>
        <Field label="สถานะ"><select className={inputClass} name="operatingStatus" defaultValue={asset.operatingStatus}><option value="IN_SERVICE">ใช้งาน</option><option value="UNDER_REPAIR">ปิดซ่อม</option><option value="STANDBY">สำรอง</option><option value="TEMPORARILY_OUT">หยุดใช้งานชั่วคราว</option><option value="RETIRED">ปลดระวาง</option></select></Field>
        <Field label="Criticality"><select className={inputClass} name="criticality" defaultValue={asset.criticality}><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
      </Section>
      <Section title="ข้อมูลทางเทคนิค" description="ค่าที่แสดงอ้างอิงจาก Asset Type ปัจจุบัน">
        <div className="col-span-full grid gap-3 md:grid-cols-2">{asset.assetType?.fields.length ? asset.assetType.fields.map(field=>{const value=asset.technicalValues.find(item=>item.fieldId===field.id);return <Field key={field.id} label={`${field.labelTh}${field.unit?` (${field.unit})`:""}`}><input className={inputClass} name={`tech_${field.id}`} defaultValue={value?.value||""} required={field.required} type={field.dataType==="NUMBER"?"number":field.dataType==="DATE"?"date":"text"}/></Field>}) : <p className="text-sm text-[var(--muted)]">Asset Type นี้ยังไม่มี Technical Field Template</p>}</div>
      </Section>
      <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)]/95 p-3 shadow-lg backdrop-blur"><button className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"><Save size={18}/>บันทึกการแก้ไข</button></div>
    </form>
  </AppShell>;
}
function Section({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700"><Pencil size={19}/></span><div><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-[var(--muted)]">{description}</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div></section>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="grid gap-1.5 text-sm font-bold">{label}{children}</label>}
function optional(data:FormData,key:string){return String(data.get(key)||"").trim()||null}
function required(data:FormData,key:string){return String(data.get(key)||"").trim()}
function dateValue(value:Date|null){return value?value.toISOString().slice(0,10):""}
const inputClass="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
