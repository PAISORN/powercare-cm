"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CirclePlus, Save, X } from "lucide-react";

export type TreeAssetLevel = "MAIN_ASSET" | "SUB_ASSET" | "PART";

export type TreeAssetCreateState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type TreeAssetCreateAction = (
  previousState: TreeAssetCreateState,
  formData: FormData,
) => Promise<TreeAssetCreateState>;

export type TreeAssetCreateOptions = {
  organizationId: string;
  plantId: string;
  assetTypes: { id: string; code: string; name: string; discipline: string | null }[];
  zones: { id: string; name: string }[];
};

export type TreeAssetCreateContext = {
  sourceKind: "system" | "asset";
  sourceId: string;
  systemName: string;
  parentCode: string | null;
  parentName: string | null;
  allowedLevels: TreeAssetLevel[];
};

const initialState: TreeAssetCreateState = { status: "idle" };

export function AssetTreeCreateDrawer({
  action,
  context,
  options,
  onClose,
}: {
  action: TreeAssetCreateAction;
  context: TreeAssetCreateContext;
  options: TreeAssetCreateOptions;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [level, setLevel] = useState<TreeAssetLevel>(context.allowedLevels[0]);
  const [discipline, setDiscipline] = useState("");

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

  const nameLabel = level === "MAIN_ASSET" ? "MAIN ASSET" : level === "SUB_ASSET" ? "SUB-ASSET" : "PART-ASSET";

  return <>
    <button aria-label="ปิดแถบเพิ่ม Asset" className="fixed inset-0 z-[80] cursor-default bg-slate-950/25 backdrop-blur-sm" onClick={onClose} type="button"/>
    <aside aria-labelledby="asset-create-drawer-title" aria-modal="true" className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-xl flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl" role="dialog">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-emerald-700"><CirclePlus size={16}/>เพิ่มรายการ</p>
          <h2 className="mt-1 text-xl font-black" id="asset-create-drawer-title">เพิ่ม Asset ใน Tree</h2>
          <p className="mt-1 text-sm text-slate-500">กรอกข้อมูลตามหัวข้อ Asset R8</p>
        </div>
        <button aria-label="ปิด" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={onClose} type="button"><X size={20}/></button>
      </header>

      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input name="organizationId" type="hidden" value={options.organizationId}/>
        <input name="plantId" type="hidden" value={options.plantId}/>
        <input name="sourceKind" type="hidden" value={context.sourceKind}/>
        <input name="sourceId" type="hidden" value={context.sourceId}/>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-5 grid gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm">
            <p><span className="font-bold text-slate-500">SYSTEM</span><span className="ml-2 font-black text-violet-900">{context.systemName}</span></p>
            {context.parentCode ? <p><span className="font-bold text-slate-500">PARENT ASSET</span><span className="ml-2 font-mono font-black text-slate-900">{context.parentCode}</span><span className="ml-2 text-slate-600">{context.parentName}</span></p> : <p className="text-xs text-slate-500">รายการใหม่จะอยู่ใต้ System โดยตรง</p>}
          </div>

          {state.status === "error" ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700" role="alert">{state.message}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ASSET LEVEL">
              <select className={inputClass} name="assetLevel" required value={level} onChange={event => setLevel(event.target.value as TreeAssetLevel)}>
                {context.allowedLevels.map(value => <option key={value} value={value}>{assetLevelLabel(value)}</option>)}
              </select>
            </Field>
            <Field label="CODE ASSET"><input autoFocus className={inputClass} name="code" placeholder={codePlaceholder(level)} required/></Field>
            <Field label={nameLabel} wide><input className={inputClass} name="nameTh" placeholder="ชื่อเครื่องจักรหรืออุปกรณ์" required/></Field>
            <Field label="AREA / ZONE">
              <select className={inputClass} name="zoneId"><option value="">ไม่ระบุ Area / Zone</option>{options.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>
            </Field>
            <Field label="ASSET TYPE">
              <select className={inputClass} name="assetTypeId" required onChange={event => {
                const type = options.assetTypes.find(item => item.id === event.target.value);
                setDiscipline(type?.discipline || "");
              }} defaultValue="">
                <option disabled value="">เลือก Asset Type</option>
                {options.assetTypes.map(type => <option key={type.id} value={type.id}>{type.code} · {type.name}</option>)}
              </select>
            </Field>
            <Field label="DISCIPLINE"><input className={inputClass} list="tree-asset-disciplines" name="discipline" value={discipline} onChange={event => setDiscipline(event.target.value)}/><datalist id="tree-asset-disciplines">{["Mechanical", "Electrical", "Instrument", "Control"].map(value => <option key={value} value={value}/>)}</datalist></Field>
            <Field label="CRITICALITY"><select className={inputClass} defaultValue="MEDIUM" name="criticality"><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
            <Field label="MANUFACTURER"><input className={inputClass} name="manufacturer"/></Field>
            <Field label="MODEL / TYPE"><input className={inputClass} name="model"/></Field>
            <Field label="SERIAL NO."><input className={inputClass} name="serialNumber"/></Field>
            <Field label="STATUS"><select className={inputClass} name="operatingStatus"><option value="IN_SERVICE">ใช้งาน</option><option value="UNDER_REPAIR">ปิดซ่อม</option><option value="STANDBY">สำรอง</option><option value="TEMPORARILY_OUT">หยุดใช้งานชั่วคราว</option><option value="RETIRED">ปลดระวาง</option></select></Field>
            <Field label="KEY SPECIFICATION" wide><textarea className={`${inputClass} min-h-24 py-3`} name="keySpecification"/></Field>
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
  return <button className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit"><Save size={17}/>{pending ? "กำลังบันทึก..." : "บันทึก Asset"}</button>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid content-start gap-1.5 text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}

function assetLevelLabel(level: TreeAssetLevel) {
  return level === "MAIN_ASSET" ? "Main Asset" : level === "SUB_ASSET" ? "Sub-Asset" : "Part-Asset";
}

function codePlaceholder(level: TreeAssetLevel) {
  return level === "MAIN_ASSET" ? "MA-XXX-001" : level === "SUB_ASSET" ? "SA-XXX-001-01" : "PA-XXX-001-01";
}

const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15";
