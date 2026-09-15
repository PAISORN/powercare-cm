"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Save, X } from "lucide-react";
import type { AssetTreeItem } from "./asset-tree-workspace";
import type { TreeAssetCreateOptions } from "./asset-tree-create-drawer";

export type TreeAssetEditState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type TreeAssetEditAction = (
  previousState: TreeAssetEditState,
  formData: FormData,
) => Promise<TreeAssetEditState>;

export type TreeAssetEditData = {
  assetTypeId: string;
  zoneId: string;
  discipline: string;
  criticality: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  operatingStatus: string;
  keySpecification: string;
};

const initialState: TreeAssetEditState = { status: "idle" };

export function AssetTreeEditDrawer({
  action,
  asset,
  canRecode,
  options,
  onClose,
}: {
  action: TreeAssetEditAction;
  asset: AssetTreeItem;
  canRecode: boolean;
  options: TreeAssetCreateOptions;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [discipline, setDiscipline] = useState(asset.editData.discipline);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);

  return <>
    <button aria-label="ปิดแถบแก้ไข Asset" className="fixed inset-0 z-[80] cursor-default bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button"/>
    <aside aria-labelledby="asset-edit-drawer-title" aria-modal="true" className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-xl flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl" role="dialog">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-blue-700"><Pencil size={16}/>แก้ไขรายการ</p>
          <h2 className="mt-1 text-xl font-black" id="asset-edit-drawer-title">แก้ไข Asset ใน Tree</h2>
          <p className="mt-1 text-sm text-slate-500">แก้ไขข้อมูลตามหัวข้อ Asset R8</p>
        </div>
        <button aria-label="ปิด" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" onClick={onClose} type="button"><X size={20}/></button>
      </header>

      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input name="assetId" type="hidden" value={asset.id}/>
        <input name="organizationId" type="hidden" value={options.organizationId}/>
        <input name="plantId" type="hidden" value={options.plantId}/>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-5 grid gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm">
            <p><span className="font-bold text-slate-500">SYSTEM</span><span className="ml-2 font-black text-violet-900">{asset.systemName}</span></p>
            <p><span className="font-bold text-slate-500">ASSET LEVEL</span><span className="ml-2 font-black text-slate-900">{asset.levelLabel}</span></p>
          </div>

          {state.status === "error" ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700" role="alert">{state.message}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CODE ASSET">
              {canRecode
                ? <input autoFocus className={inputClass} defaultValue={asset.code} name="code" required/>
                : <><input name="code" type="hidden" value={asset.code}/><input aria-label="CODE ASSET" className={readOnlyClass} disabled value={asset.code}/><span className="text-xs font-medium text-slate-500">รหัสแก้ไขได้เฉพาะผู้มีสิทธิ์ Recode Asset</span></>}
            </Field>
            <Field label="AREA / ZONE">
              <select className={inputClass} defaultValue={asset.editData.zoneId} name="zoneId"><option value="">ไม่ระบุ Area / Zone</option>{options.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>
            </Field>
            <Field label={asset.levelLabel.toUpperCase()} wide><input autoFocus={!canRecode} className={inputClass} defaultValue={asset.name} name="name" required/></Field>
            <Field label="ASSET TYPE">
              <select className={inputClass} defaultValue={asset.editData.assetTypeId} name="assetTypeId" required onChange={event => {
                const type = options.assetTypes.find(item => item.id === event.target.value);
                setDiscipline(type?.discipline || "");
              }}>
                {options.assetTypes.map(type => <option key={type.id} value={type.id}>{type.code} · {type.name}</option>)}
              </select>
            </Field>
            <Field label="DISCIPLINE"><input className={inputClass} list="tree-asset-edit-disciplines" name="discipline" value={discipline} onChange={event => setDiscipline(event.target.value)}/><datalist id="tree-asset-edit-disciplines">{["Mechanical", "Electrical", "Instrument", "Control"].map(value => <option key={value} value={value}/>)}</datalist></Field>
            <Field label="CRITICALITY"><select className={inputClass} defaultValue={asset.editData.criticality} name="criticality"><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
            <Field label="MANUFACTURER"><input className={inputClass} defaultValue={asset.editData.manufacturer} name="manufacturer"/></Field>
            <Field label="MODEL / TYPE"><input className={inputClass} defaultValue={asset.editData.model} name="model"/></Field>
            <Field label="SERIAL NO."><input className={inputClass} defaultValue={asset.editData.serialNumber} name="serialNumber"/></Field>
            <Field label="STATUS"><select className={inputClass} defaultValue={asset.editData.operatingStatus} name="operatingStatus"><option value="IN_SERVICE">ใช้งาน</option><option value="UNDER_REPAIR">ปิดซ่อม</option><option value="STANDBY">สำรอง</option><option value="TEMPORARILY_OUT">หยุดใช้งานชั่วคราว</option><option value="RETIRED">ปลดระวาง</option></select></Field>
            <Field label="KEY SPECIFICATION" wide><textarea className={`${inputClass} min-h-24 py-3`} defaultValue={asset.editData.keySpecification} name="keySpecification"/></Field>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={onClose} type="button">ยกเลิก</button>
          <SubmitButton/>
        </footer>
      </form>
    </aside>
  </>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit"><Save size={17}/>{pending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid content-start gap-1.5 text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}

const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15";
const readOnlyClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 font-mono text-sm font-bold text-slate-500";
