"use client";
import { useState } from "react";
import { assetLevelLabel } from "./asset-hierarchy";

type Parent = { id:string; code:string|null; nameTh:string; nameEn:string|null; parentId:string|null; systemId:string|null; assetLevel:string|null; plantId:string; migrationStatus?:string|null };
type AssetType = { id:string; code:string; nameTh:string; nameEn:string|null; defaultLevel?:string|null; discipline?:string|null };
export function eligibleAssetParents(parents: Parent[], {id, plantId, systemId, level}: { id?:string; plantId:string; systemId:string; level:string }) {
  const excluded = new Set(id ? [id] : []);
  let changed = true;
  while(changed) { changed=false; for(const parent of parents) if(parent.parentId && excluded.has(parent.parentId) && !excluded.has(parent.id)){excluded.add(parent.id);changed=true;} }
  return parents.filter(parent => !excluded.has(parent.id) && parent.plantId===plantId && parent.systemId===systemId && (!parent.migrationStatus || parent.migrationStatus==="READY") && (level==="SUB_ASSET" ? parent.assetLevel==="MAIN_ASSET" : level==="PART" && ["MAIN_ASSET","SUB_ASSET"].includes(parent.assetLevel||"")));
}
export function AssetHierarchyFields({plantId,systems,types,parents,asset,canEditCode=true}: {plantId:string;systems:{id:string;code:string;name:string}[];types:AssetType[];parents:Parent[];canEditCode?:boolean;asset?:{id:string;code:string;systemId:string|null;assetLevel:string|null;parentId:string|null;assetTypeId:string|null;discipline:string|null;tagKks:string|null;registrationCode:string|null;keySpecification:string|null}}) {
 const [systemId,setSystemId]=useState(asset?.systemId||"");
 const [level,setLevel]=useState(asset?.assetLevel||"MAIN_ASSET");
 const [parentId,setParentId]=useState(asset?.parentId||"");
 const [typeId,setTypeId]=useState(asset?.assetTypeId||"");
 const [discipline,setDiscipline]=useState(asset?.discipline||"");
 const eligible=eligibleAssetParents(parents,{id:asset?.id,plantId,systemId,level});
 return <>
  {asset?<Field label="Asset Code"><input name="code" className={inputClass} defaultValue={asset.code} required readOnly={!canEditCode} aria-readonly={!canEditCode}/><span className="text-xs font-normal text-[var(--muted)]">{canEditCode ? "รหัสต้องเป็น MC-XXX-001 หรือ exception ที่อนุมัติไว้" : "บัญชีนี้ไม่มีสิทธิ์เปลี่ยนรหัส Asset"}</span></Field>:<div className="grid content-start gap-1.5 text-sm font-bold"><span>Asset Code</span><p className={`${inputClass} flex items-center text-[var(--muted)]`}>ระบบสร้าง MC-XXX-001 จาก Asset Type หลังบันทึก</p></div>}
  <Field label="System"><select name="systemId" className={inputClass} value={systemId} required onChange={event=>{setSystemId(event.target.value);setParentId("");}}><option value="">เลือก System</option>{systems.map(system=><option key={system.id} value={system.id}>{system.code} · {system.name}</option>)}</select></Field>
  <Field label="Asset Type"><select name="assetTypeId" className={inputClass} value={typeId} required onChange={event=>{setTypeId(event.target.value);const type=types.find(type=>type.id===event.target.value);if(type?.defaultLevel){setLevel(type.defaultLevel);setParentId("");}if(type?.discipline)setDiscipline(type.discipline);}}><option value="">เลือกชนิดอุปกรณ์</option>{types.map(type=><option key={type.id} value={type.id}>{type.code} · {type.nameEn||type.nameTh}</option>)}</select></Field>
  <Field label="Asset Level"><select name="assetLevel" className={inputClass} value={level} required onChange={event=>{setLevel(event.target.value);setParentId("");}}>{["MAIN_ASSET","SUB_ASSET","PART"].map(value=><option key={value} value={value}>{assetLevelLabel(value)}</option>)}</select></Field>
  {level!=="MAIN_ASSET"?<Field label="Parent Asset"><select name="parentId" className={inputClass} value={eligible.some(parent=>parent.id===parentId)?parentId:""} required onChange={event=>setParentId(event.target.value)}><option value="">เลือกเครื่องจักรที่เกี่ยวข้อง</option>{eligible.map(parent=><option key={parent.id} value={parent.id}>{parent.code || "(ไม่มีรหัส)"} · {parent.nameEn||parent.nameTh} ({assetLevelLabel(parent.assetLevel)})</option>)}</select><span className="text-xs font-normal text-[var(--muted)]">เลือกภายใน Site และ System เดียวกัน{level==="SUB_ASSET"?" เฉพาะ Main Asset":" เฉพาะ Main Asset หรือ Sub-Asset"}</span></Field>:<input type="hidden" name="parentId" value=""/>}
  <Field label="Discipline"><input name="discipline" className={inputClass} list="asset-disciplines" value={discipline} onChange={event=>setDiscipline(event.target.value)}/><datalist id="asset-disciplines">{["Mechanical","Electrical","Instrument","Control"].map(value=><option key={value} value={value}/>)}</datalist></Field>
  <Field label="Tag / KKS"><input name="tagKks" className={inputClass} defaultValue={asset?.tagKks||""}/></Field>
  <Field label="Registration Code"><input name="registrationCode" className={inputClass} defaultValue={asset?.registrationCode||""}/></Field>
  <Field label="Key Specification"><textarea name="keySpecification" className={`${inputClass} py-3`} rows={3} defaultValue={asset?.keySpecification||""}/></Field>
 </>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="grid content-start gap-1.5 text-sm font-bold">{label}{children}</label>}
const inputClass="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
