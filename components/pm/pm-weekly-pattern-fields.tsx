"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { firstWeekMonday } from "../../modules/pm/pm-annual-types";

type Target = { id: string; label: string; active: boolean };
const dayOfWeek = (day: string) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day) + 1;
type Pattern = { dayOfWeek: number; weekIndex: number; assetSystemId: string | null; zoneId: string | null };

export function PmWeeklyPatternFields({
  weekdays, targets, patterns, pmBy, year, initialCycleWeeks, initialAnchorDateKey,
}: {
  weekdays: readonly string[];
  targets: Target[];
  patterns: Pattern[];
  pmBy: string;
  year: number;
  initialCycleWeeks: number;
  initialAnchorDateKey: string | null;
}) {
  const [cycleWeeks, setCycleWeeks] = useState(initialCycleWeeks);
  const [anchorDateKey, setAnchorDateKey] = useState(initialAnchorDateKey ?? firstWeekMonday(year));
  const [rowsByWeek, setRowsByWeek] = useState<string[][][]>(() => [1, 2].map((weekIndex) =>
    weekdays.map((day) => {
      const saved = patterns
        .filter((pattern) => pattern.weekIndex === weekIndex && pattern.dayOfWeek === dayOfWeek(day))
        .map((pattern) => pattern.assetSystemId ?? pattern.zoneId)
        .filter((id): id is string => Boolean(id));
      return saved.length ? saved : [""];
    }),
  ));
  const [alternateDays, setAlternateDays] = useState<boolean[]>(() => weekdays.map((day) =>
    patterns.some((pattern) => pattern.weekIndex === 2 && pattern.dayOfWeek === dayOfWeek(day)),
  ));
  const targetType = pmBy === "SYSTEM" ? "System" : "Zone / Area";

  function setAlternateDay(dayIndex: number, enabled: boolean) {
    setAlternateDays((current) => current.map((value, index) => index === dayIndex ? enabled : value));
    if (!enabled) updateDay(2, dayIndex, [""]);
  }

  function updateDay(weekIndex: number, dayIndex: number, nextRows: string[]) {
    setRowsByWeek((current) => current.map((weekRows, index) => index === weekIndex - 1
      ? weekRows.map((rows, day) => day === dayIndex ? nextRows : rows)
      : weekRows));
  }

  return <div className="grid min-w-0 gap-4">
    <div className="grid min-w-0 gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3 sm:grid-cols-2">
      <label className="grid min-w-0 gap-1 text-sm font-bold">รูปแบบการวนซ้ำ
        <select className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3" name="patternCycleWeeks" onChange={(event) => setCycleWeeks(Number(event.target.value))} value={cycleWeeks}>
          <option value={1}>ทุกสัปดาห์</option>
          <option value={2}>สลับทุก 2 สัปดาห์ (Week A / Week B)</option>
        </select>
      </label>
      {cycleWeeks === 2 ? <label className="grid min-w-0 gap-1 text-sm font-bold">วันจันทร์เริ่ม Week A
        <input className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3" name="rotationAnchorDateKey" onChange={(event) => setAnchorDateKey(event.target.value)} required type="date" value={anchorDateKey} />
      </label> : null}
      {cycleWeeks === 2 ? <p className="text-xs text-[var(--muted)] sm:col-span-2">Week A เป็นรายการหลักทุกสัปดาห์ เลือกสลับเฉพาะบางวันใน Week B ได้ วันอื่นจะใช้รายการเดิมของ Week A</p> : null}
    </div>
    {Array.from({ length: cycleWeeks }, (_, week) => {
      const weekIndex = week + 1;
      return <section className="grid min-w-0 gap-3" key={weekIndex}>
        {cycleWeeks === 2 ? <h3 className="text-sm font-extrabold text-emerald-700">Week {weekIndex === 1 ? "A" : "B"}</h3> : null}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {weekdays.map((day, dayIndex) => {
            const rows = rowsByWeek[week][dayIndex];
            if (weekIndex === 2 && !alternateDays[dayIndex]) {
              return <fieldset className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3" key={day}>
                <legend className="px-1 text-sm font-extrabold">{day}</legend>
                <p className="text-xs text-[var(--muted)]">เหมือน Week A ทุกสัปดาห์</p>
                <button className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50" onClick={() => setAlternateDay(dayIndex, true)} type="button"><Plus aria-hidden="true" size={15} /> สลับ {day}</button>
              </fieldset>;
            }
            const selected = new Set(rows.filter(Boolean));
            const canAdd = !rows.includes("") && targets.some((target) => target.active && !selected.has(target.id));
            return <fieldset className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3" key={day}>
              <legend className="px-1 text-sm font-extrabold">{day}</legend>
              {weekIndex === 2 ? <button className="mb-2 min-h-11 text-xs font-bold text-[var(--muted)] hover:underline" onClick={() => setAlternateDay(dayIndex, false)} type="button">ใช้ Week A ตามเดิม</button> : null}
              <div className="grid gap-2">
                {rows.map((value, rowIndex) => {
                  const selectedTarget = targets.find((target) => target.id === value);
                  const label = `${cycleWeeks === 2 ? `Week ${weekIndex === 1 ? "A" : "B"} ` : ""}${day} ${targetType} ${rowIndex + 1}`;
                  return <div className="flex min-w-0 items-center gap-1" key={`${day}-${rowIndex}`}>
                    <select
                      aria-label={label}
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-sm text-[var(--ink)]"
                      onChange={(event) => updateDay(weekIndex, dayIndex, rows.map((row, index) => index === rowIndex ? event.target.value : row))}
                      required={weekIndex === 2}
                      value={value}
                    >
                      <option value="">เลือก {targetType}</option>
                      {targets.filter((target) => target.active || target.id === value).map((target) =>
                        <option disabled={selected.has(target.id) && target.id !== value} key={target.id} value={target.id}>{target.label}</option>,
                      )}
                      {value && !selectedTarget ? <option value={value}>{value} (ไม่พบรายการ)</option> : null}
                    </select>
                    {value ? <input name="pattern" type="hidden" value={`${weekIndex}:${dayOfWeek(day)}:${value}`} /> : null}
                    <button
                      aria-label={`ลบ ${label}`}
                      className="grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-red-600 hover:bg-red-50"
                      onClick={() => updateDay(weekIndex, dayIndex, rows.length === 1 ? [""] : rows.filter((_, index) => index !== rowIndex))}
                      type="button"
                    ><X aria-hidden="true" size={16} /></button>
                  </div>;
                })}
              </div>
              <button
                className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canAdd}
                onClick={() => updateDay(weekIndex, dayIndex, [...rows, ""])}
                type="button"
              ><Plus aria-hidden="true" size={15} /> เพิ่มรายการ</button>
            </fieldset>;
          })}
        </div>
      </section>;
    })}
  </div>;
}
