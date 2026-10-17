"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { PreserveListPositionForm } from "../preserve-list-position";
import { pmMonthWeekDates } from "../../modules/pm/pm-month-week";
import { isoWeekday } from "../../modules/pm/pm-annual-types";

type Row = { id: string; scheduleDateKey: string; targetId: string; label: string; locked: boolean; source: string };
type Entry = { key: string; scheduleId?: string; dayOfWeek: number; targetId: string; locked: boolean };
type Props = {
  year: number; month: number; weekNumber: number; rows: Row[]; revision: string;
  targets: Array<{ id: string; label: string; active: boolean }>;
  today: string; effectiveDate: string | null; active: boolean; positionKey: string; open?: boolean;
  hidden: Record<string, string>; action: (data: FormData) => Promise<void>;
};
const weekdays = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const field = "min-h-11 min-w-0 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]";

export function PmMonthWeekEditor(props: Props) {
  const { year, month, weekNumber, rows, targets, active, today, effectiveDate } = props;
  const days = pmMonthWeekDates(year, month, weekNumber);
  const editableDays = days.filter(day => (!active || day.date >= today) && (!effectiveDate || day.date >= effectiveDate));
  const [entries, setEntries] = useState<Entry[]>(() => rows.map(row => ({ key: row.id, scheduleId: row.id,
    dayOfWeek: isoWeekday(row.scheduleDateKey), targetId: row.targetId, locked: row.locked })));
  const [dayOfWeek, setDayOfWeek] = useState(editableDays[0]?.dayOfWeek ?? 1);
  const [targetId, setTargetId] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [nextKey, setNextKey] = useState(0);
  const labels = new Map(targets.map(target => [target.id, target.label]));
  rows.forEach(row => { if (!labels.has(row.targetId)) labels.set(row.targetId, row.label); });
  const options = targets.filter(target => target.active && target.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  function add() {
    if (!targetId) return;
    if (entries.some(entry => entry.dayOfWeek === dayOfWeek && entry.targetId === targetId)) {
      setNotice("มีเป้าหมายนี้ในวันที่เลือกแล้ว"); return;
    }
    setEntries(current => [...current, { key: `new-${nextKey}`, dayOfWeek, targetId, locked: false }]);
    setNextKey(current => current + 1); setTargetId(""); setNotice("");
  }
  function update(key: string, values: Partial<Entry>) {
    setEntries(current => current.map(entry => entry.key === key ? { ...entry, ...values } : entry));
  }
  const duplicate = entries.some((entry, index) => entries.some((other, otherIndex) => otherIndex !== index && entry.targetId === other.targetId && entry.dayOfWeek === other.dayOfWeek));
  return (
    <details open={props.open} className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4" id={`pm-month-week-${weekNumber}`} data-pm-month-week={weekNumber}>
      <summary className="cursor-pointer text-sm font-extrabold">Week {weekNumber} · {month}/{year} <span className="font-normal text-[var(--muted)]">({rows.length} รายการ) · แก้เฉพาะ Week นี้</span></summary>
      <p className="mt-3 text-xs leading-6 text-[var(--muted)]">ครั้งที่ {weekNumber} ของวันในเดือนนี้เท่านั้น ไม่แก้ Pattern ต้นแบบหรือเดือนอื่น รายการที่ออก PM Work แล้วแก้ไขไม่ได้</p>
      {!editableDays.length ? <p className="mt-3 text-sm text-[var(--muted)]">ไม่มีวันที่แก้ไขได้ใน Week นี้</p> : null}
      <PreserveListPositionForm action={props.action} storageKey={props.positionKey} targetId={`pm-month-week-${weekNumber}`} className="mt-3 grid min-w-0 gap-3">
        {Object.entries(props.hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <input type="hidden" name="weekNumber" value={weekNumber} />
        <input type="hidden" name="revision" value={props.revision} />
        <input type="hidden" name="weekEntries" value={JSON.stringify(entries.map(({ scheduleId, dayOfWeek, targetId }) => ({ scheduleId, dayOfWeek, targetId })))} />
        <div className="grid gap-2">
          {entries.map(entry => <article key={entry.key} className="grid min-w-0 gap-2 rounded-xl bg-[var(--soft)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <label className="grid gap-1 text-xs font-bold">เป้าหมาย PM
                <select aria-label={`เป้าหมาย ${entry.key}`} className={field} disabled={entry.locked} value={entry.targetId} onChange={event => update(entry.key, { targetId: event.target.value })}>
                  {targets.filter(target => target.active || target.id === entry.targetId).map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
                  {!targets.some(target => target.id === entry.targetId) ? <option value={entry.targetId}>{labels.get(entry.targetId)}</option> : null}
                </select>
              </label>
              {entry.locked ? <p className="mt-1 text-xs text-[var(--muted)]">ล็อก: ออก PM Work แล้วหรือเป็นวันที่ผ่านมา</p> : null}
            </div>
            <label className="grid content-start gap-1 text-xs font-bold">วันที่ PM
              <select aria-label={`วันที่ ${entry.key}`} className={field} disabled={entry.locked} value={entry.dayOfWeek} onChange={event => update(entry.key, { dayOfWeek: Number(event.target.value) })}>
                {days.map(day => <option key={day.dayOfWeek} value={day.dayOfWeek} disabled={!editableDays.some(editable => editable.dayOfWeek === day.dayOfWeek)}>{weekdays[day.dayOfWeek - 1]} · {day.date}</option>)}
              </select>
            </label>
            <button type="button" aria-label={`ลบ ${labels.get(entry.targetId)}`} className="min-h-11 rounded-xl px-3 text-red-600 disabled:opacity-40 sm:self-end" disabled={entry.locked} onClick={() => setEntries(current => current.filter(item => item.key !== entry.key))}><Trash2 size={18} aria-hidden="true" /></button>
          </article>)}
          {!entries.length ? <p className="rounded-xl bg-[var(--soft)] p-3 text-sm text-[var(--muted)]">ยังไม่มีรายการ PM ใน Week นี้</p> : null}
        </div>
        {editableDays.length ? <fieldset className="grid min-w-0 gap-2 rounded-xl border border-dashed border-[var(--line)] p-3">
          <legend className="px-1 text-sm font-bold">เพิ่ม PM ใน Week {weekNumber}</legend>
          <input aria-label={`ค้นหาเป้าหมาย Week ${weekNumber}`} className={field} type="search" placeholder="ค้นหา System / Zone" value={search} onChange={event => { setSearch(event.target.value); setTargetId(""); }} />
          <select aria-label={`เลือกเป้าหมาย Week ${weekNumber}`} className={field} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">เลือกเป้าหมาย PM</option>{options.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select>
          <select aria-label={`เลือกวันที่ Week ${weekNumber}`} className={field} value={dayOfWeek} onChange={event => setDayOfWeek(Number(event.target.value))}>{editableDays.map(day => <option key={day.dayOfWeek} value={day.dayOfWeek}>{weekdays[day.dayOfWeek - 1]} · {day.date}</option>)}</select>
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-600 px-3 text-sm font-bold text-emerald-700 disabled:opacity-40" disabled={!targetId} onClick={add}><Plus size={16} aria-hidden="true" />เพิ่มรายการใน Week {weekNumber}</button>
        </fieldset> : null}
        {notice || duplicate ? <p role="alert" className="text-sm text-red-600">{duplicate ? "เป้าหมายซ้ำในวันเดียวกัน กรุณาแก้ไขก่อนบันทึก" : notice}</p> : null}
        {editableDays.length ? <>
          <label className="grid gap-1 text-sm font-bold">เหตุผลที่แก้ไข Week นี้<input className={field} name="reason" required={active} placeholder={active ? "จำเป็นสำหรับแผน Active" : "ระบุเหตุผล (ถ้ามี)"} /></label>
          <SaveWeek disabled={duplicate} week={weekNumber} />
        </> : null}
      </PreserveListPositionForm>
    </details>
  );
}

function SaveWeek({ disabled, week }: { disabled: boolean; week: number }) {
  const { pending } = useFormStatus();
  return <button disabled={disabled || pending} aria-busy={pending} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">{pending ? "กำลังบันทึก…" : `บันทึกเฉพาะ Week ${week}`}</button>;
}
