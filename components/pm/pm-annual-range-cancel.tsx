"use client";

import { useEffect, useMemo, useState } from "react";
import { PreserveListPositionForm } from "../preserve-list-position";

type ScheduleOption = { id: string; scheduleDateKey: string; label: string };
type Props = {
  action: (data: FormData) => void | Promise<void>;
  organizationId: string; plantId: string; planId: string; year: number; view: string; month: number;
  schedules: ScheduleOption[]; storageKey: string;
};

export function PmAnnualRangeCancel({ action, organizationId, plantId, planId, year, view, month, schedules, storageKey }: Props) {
  const [start, setStart] = useState(`${year}-01-01`);
  const [end, setEnd] = useState(`${year}-12-31`);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const affected = useMemo(() => schedules.filter(row => row.scheduleDateKey >= start && row.scheduleDateKey <= end), [end, schedules, start]);
  useEffect(() => setSelected(new Set(affected.map(row => row.id))), [start, end, schedules]);
  return <PreserveListPositionForm action={action} className="grid grid-cols-2 gap-2" storageKey={storageKey} targetId="pm-setup-workspace">
    <input name="organizationId" type="hidden" value={organizationId}/><input name="plantId" type="hidden" value={plantId}/><input name="planId" type="hidden" value={planId}/><input name="year" type="hidden" value={year}/><input name="view" type="hidden" value={view}/><input name="month" type="hidden" value={month}/>
    <input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-2" max={`${year}-12-31`} min={`${year}-01-01`} name="startDateKey" onChange={event=>setStart(event.target.value)} required type="date" value={start}/><input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-2" max={`${year}-12-31`} min={`${year}-01-01`} name="endDateKey" onChange={event=>setEnd(event.target.value)} required type="date" value={end}/>
    <input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3" name="reason" placeholder="เหตุผล เช่น Shutdown" required/>
    <button className="min-h-11 rounded-xl border border-amber-500 px-4 font-bold text-amber-800" disabled={!affected.length} onClick={()=>setOpen(true)} type="button">No-PM ช่วงวันที่ ({selected.size}/{affected.length})</button>
    {affected.map(row=><input key={`all-${row.id}`} name="affectedScheduleIds" type="hidden" value={row.id}/>)}
    {open?<div aria-modal="true" className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog"><section className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 text-slate-900 shadow-2xl"><h3 className="text-xl font-extrabold">ยืนยันรายการ No-PM</h3><p className="mt-2 text-sm text-slate-600">เลือกไว้ทั้งหมดเป็นค่าเริ่มต้น คุณสามารถเอาเครื่องหมายออกจากรายการที่ไม่ต้องการยกเลิกได้</p><div className="mt-4 grid gap-2">{affected.map(row=><label className="flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm" key={row.id}><input checked={selected.has(row.id)} name="includedScheduleIds" onChange={event=>setSelected(current=>{const next=new Set(current);if(event.target.checked)next.add(row.id);else next.delete(row.id);return next;})} type="checkbox" value={row.id}/><span><strong>{row.scheduleDateKey}</strong> · {row.label}</span></label>)}</div><div className="mt-5 grid grid-cols-2 gap-3"><button className="min-h-11 rounded-xl border font-bold" onClick={()=>setOpen(false)} type="button">ย้อนกลับ</button><button className="min-h-11 rounded-xl bg-amber-600 px-4 font-bold text-white" disabled={!selected.size} type="submit">ยืนยัน No-PM {selected.size} รายการ</button></div></section></div>:null}
  </PreserveListPositionForm>;
}
