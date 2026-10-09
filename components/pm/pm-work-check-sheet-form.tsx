import type { PmCheckSheetSnapshot } from "../../modules/pm/pm-check-sheet";
import { pmCheckSheetOtherName, pmCheckSheetResultName } from "../../modules/pm/pm-check-sheet";

export function PmWorkCheckSheetForm({
  snapshot,
  values,
  action,
  readOnly = false,
}: {
  snapshot: PmCheckSheetSnapshot;
  values: Record<string, string>;
  action?: (data: FormData) => Promise<void>;
  readOnly?: boolean;
}) {
  return <form action={action} className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
    <fieldset disabled={readOnly}>
      <header className="border-b border-[var(--line)] p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">PM Check Sheet Snapshot</p><h2 className="mt-1 text-xl font-black">{snapshot.assetCode ?? "—"} · {snapshot.assetName}</h2><p className="mt-1 text-sm text-[var(--muted)]">{snapshot.assetTypeName ?? "ยังไม่ได้ระบุ Asset Type"} · {snapshot.items.length} รายการ</p></header>
      <div className="divide-y divide-[var(--line)]">
        {snapshot.items.map((item, index) => {
          const resultName = pmCheckSheetResultName(snapshot.assetId, item);
          const otherName = pmCheckSheetOtherName(snapshot.assetId, item);
          const options = technicalOptions(item.optionsJson, item.dataType);
          return <div className="grid gap-3 p-4 lg:grid-cols-[3rem_minmax(180px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)] lg:items-start" key={`${item.source}-${item.id}`}>
            <span className="font-mono text-sm font-black text-slate-400">{index + 1}.</span>
            <div><p className="font-bold">{item.labelTh}{item.required ? <span className="ml-1 text-red-600">*</span> : null}<span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${item.source === "CUSTOM" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{item.source === "CUSTOM" ? "Custom" : "Default"}</span></p>{item.indicatorText ? <p className="mt-1 text-xs text-[var(--muted)]">{item.indicatorText}</p> : null}</div>
            {options.length ? <select aria-label={`ผลตรวจสอบ ${item.labelTh}`} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" defaultValue={values[resultName] ?? ""} name={resultName} required={item.required}><option value="">เลือกผลตรวจสอบ</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <label className="flex min-h-11 overflow-hidden rounded-xl border border-[var(--line)]"><input aria-label={`ผลตรวจสอบ ${item.labelTh}`} className="min-w-0 flex-1 bg-transparent px-3" defaultValue={values[resultName] ?? ""} name={resultName} placeholder={item.helpText ?? "กรอกผลตรวจสอบ"} required={item.required} type={item.dataType === "NUMBER" ? "number" : item.dataType === "DATE" ? "date" : "text"}/>{item.unit ? <span className="flex items-center border-l border-[var(--line)] bg-[var(--soft)] px-3 text-xs font-bold">{item.unit}</span> : null}</label>}
            <textarea aria-label={`ข้อมูลอื่นๆ ${item.labelTh}`} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2" defaultValue={values[otherName] ?? ""} name={otherName} placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)" rows={2}/>
          </div>;
        })}
        {!snapshot.items.length ? <p className="p-8 text-center text-sm text-[var(--muted)]">PM Work นี้ไม่มีรายการตรวจสอบใน Snapshot</p> : null}
      </div>
      {!readOnly && action ? <div className="grid gap-3 border-t border-[var(--line)] p-5 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">สรุปผล<select className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" name="result" required><option value="NORMAL">Normal</option><option value="ABNORMAL">Abnormal</option></select></label><label className="grid gap-1 text-sm font-bold">หมายเหตุ<input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" name="note"/></label><button className="min-h-11 rounded-xl bg-emerald-600 px-4 font-black text-white sm:col-span-2 sm:justify-self-end">บันทึกผลและปิดงาน PM</button></div> : null}
    </fieldset>
  </form>;
}

function technicalOptions(optionsJson: string | null, dataType: string) {
  if (dataType === "BOOLEAN" && !optionsJson) return ["ใช่", "ไม่ใช่"];
  try { const parsed = JSON.parse(optionsJson ?? "null"); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; }
}
