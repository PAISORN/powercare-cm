"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Target = { id: string; label: string; active: boolean };
type Pattern = {
  weekNumber: number;
  dayOfWeek: number;
  displayOrder: number;
  assetSystemId: string | null;
  zoneId: string | null;
};
type Week = { weekNumber: number; mode: string };
type Item = {
  key: string;
  weekNumber: number;
  dayOfWeek: number;
  targetId: string;
};

const weekNumbers = [1, 2, 3, 4, 5] as const;
const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

function itemKey(weekNumber: number, dayOfWeek: number, targetId: string) {
  return `${weekNumber}:${dayOfWeek}:${targetId}`;
}

export function PmMonthlyPatternBuilder({
  patterns,
  weeks,
  targets,
  pmBy,
  initialWeek5Rule,
}: {
  patterns: Pattern[];
  weeks: Week[];
  targets: Target[];
  pmBy: string;
  initialWeek5Rule: string;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    patterns.map((pattern) => {
      const targetId = pattern.assetSystemId ?? pattern.zoneId ?? "";
      return {
        key: itemKey(pattern.weekNumber, pattern.dayOfWeek, targetId),
        weekNumber: pattern.weekNumber,
        dayOfWeek: pattern.dayOfWeek,
        targetId,
      };
    }),
  );
  const [modes, setModes] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      weekNumbers.map((weekNumber) => [
        weekNumber,
        weeks.find((week) => week.weekNumber === weekNumber)?.mode ?? (weekNumber === 5 ? (initialWeek5Rule === "REPEAT_WEEK_1" ? "REPEAT_WEEK_1" : "NO_PM") : "ASSIGNMENTS"),
      ]),
    ),
  );
  const [pendingWeek, setPendingWeek] = useState(1);
  const [pendingDay, setPendingDay] = useState(1);
  const [pendingTargets, setPendingTargets] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const targetLabels = useMemo(
    () => new Map(targets.map((target) => [target.id, target.label])),
    [targets],
  );
  const activeTargets = useMemo(
    () => targets.filter((target) => target.active),
    [targets],
  );
  const visibleTargets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? activeTargets.filter((target) =>
          target.label.toLocaleLowerCase().includes(normalized),
        )
      : activeTargets;
  }, [activeTargets, query]);
  const targetType = pmBy === "SYSTEM" ? "System" : "Zone / Area";
  const configuredWeeks = weekNumbers.filter(
    (weekNumber) =>
      modes[weekNumber] === "NO_PM" || modes[weekNumber] === "REPEAT_WEEK_1" ||
      items.some((item) => item.weekNumber === weekNumber),
  ).length;

  function toggleTarget(targetId: string) {
    setPendingTargets((current) =>
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId],
    );
  }

  function toggleVisibleTargets() {
    setPendingTargets((current) => {
      const visibleIds = visibleTargets.map((target) => target.id);
      const allSelected = visibleIds.every((id) => current.includes(id));
      return allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function addTargets() {
    if (!pendingTargets.length) return;
    appendTargets(pendingWeek, pendingDay, pendingTargets);
    setPendingTargets([]);
    setQuery("");
  }

  function appendTargets(weekNumber: number, dayOfWeek: number, targetIds: string[]) {
    const allowedIds = new Set(activeTargets.map(target => target.id));
    setModes((current) => ({ ...current, [weekNumber]: "ASSIGNMENTS" }));
    setItems((current) => {
      const keys = new Set(
        current.map((item) =>
          itemKey(item.weekNumber, item.dayOfWeek, item.targetId),
        ),
      );
      const additions = [...new Set(targetIds)]
        .filter((targetId) => allowedIds.has(targetId) && !keys.has(itemKey(weekNumber, dayOfWeek, targetId)))
        .map((targetId) => ({
          key: itemKey(weekNumber, dayOfWeek, targetId),
          weekNumber,
          dayOfWeek,
          targetId,
        }));
      return [...current, ...additions];
    });
  }

  function setNoPm(weekNumber: number, noPm: boolean) {
    setModes((current) => ({
      ...current,
      [weekNumber]: noPm ? "NO_PM" : "ASSIGNMENTS",
    }));
    if (noPm) {
      setItems((current) =>
        current.filter((item) => item.weekNumber !== weekNumber),
      );
    }
  }

  function updateItem(
    key: string,
    values: Partial<Pick<Item, "weekNumber" | "dayOfWeek" | "targetId">>,
  ) {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...values };
        const duplicate = current.some(
          (other) =>
            other.key !== key &&
            other.weekNumber === next.weekNumber &&
            other.dayOfWeek === next.dayOfWeek &&
            other.targetId === next.targetId,
        );
        return duplicate
          ? item
          : {
              ...next,
              key: itemKey(next.weekNumber, next.dayOfWeek, next.targetId),
            };
      }),
    );
  }

  function reorder(key: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.key === key);
      if (index < 0) return current;
      const group = current
        .map((item, position) => ({ item, position }))
        .filter((entry) => entry.item.weekNumber === current[index].weekNumber);
      const groupIndex = group.findIndex((entry) => entry.position === index);
      const swap = group[groupIndex + direction];
      if (!swap) return current;
      const next = [...current];
      [next[index], next[swap.position]] = [next[swap.position], next[index]];
      return next;
    });
  }

  return (
    <div className="grid gap-3">
      <details className="border-b border-slate-200 pb-4 text-slate-900">
        <summary className="cursor-pointer py-2 text-sm font-bold text-slate-600">เพิ่มหลายรายการพร้อมกัน · ตัวเลือกขั้นสูง</summary>
        <div className="grid gap-4 border-b border-[var(--line)] bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="text-base font-extrabold">ตั้งค่า Pattern ต้นแบบ</p>
            <p className="mt-1 text-sm text-slate-600">
              เลือกหลาย {targetType} จากจุดเดียว แล้วส่งไปยัง Week ที่ต้องการ
            </p>
          </div>
          <label className="grid gap-1.5 text-sm font-bold">
            กรณีเดือนมี Week 5
            <select
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
              value={modes[5] === "REPEAT_WEEK_1" ? "REPEAT_WEEK_1" : modes[5] === "ASSIGNMENTS" ? "CUSTOM" : "NO_PM"}
              onChange={event => {
                const mode = event.target.value === "CUSTOM" ? "ASSIGNMENTS" : event.target.value;
                setModes(current => ({ ...current, 5: mode }));
                if (mode !== "ASSIGNMENTS") setItems(current => current.filter(item => item.weekNumber !== 5));
              }}
            >
              <option value="NO_PM">No PM</option>
              <option value="REPEAT_WEEK_1">Repeat Week 1</option>
              <option value="CUSTOM">กำหนดรายการ Week 5 เอง</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="grid gap-1.5 text-sm font-bold">
              1. เพิ่มไปยังสัปดาห์
              <select
                aria-label="Destination week"
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
                onChange={(event) => setPendingWeek(Number(event.target.value))}
                value={pendingWeek}
              >
                {weekNumbers.map((weekNumber) => (
                  <option key={weekNumber} value={weekNumber}>
                    Week {weekNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              2. วันที่ดำเนินการ
              <select
                aria-label="Assignment weekday"
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
                onChange={(event) => setPendingDay(Number(event.target.value))}
                value={pendingDay}
              >
                {weekdays.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 sm:col-span-2 lg:col-span-1">
              <p className="font-extrabold">Week {pendingWeek}</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                ครั้งที่ {pendingWeek} ของ {weekdays[pendingDay - 1].label}
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label className="grid min-w-[15rem] flex-1 gap-1.5 text-sm font-bold">
                3. ค้นหาและเลือก {targetType}
                <span className="relative">
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={17}
                  />
                  <input
                    aria-label={`Search ${targetType}`}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-slate-900 placeholder:text-slate-400"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`ค้นหา ${targetType}...`}
                    type="search"
                    value={query}
                  />
                </span>
              </label>
              <button
                className="min-h-10 rounded-lg px-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:text-slate-400"
                disabled={!visibleTargets.length}
                onClick={toggleVisibleTargets}
                type="button"
              >
                {visibleTargets.length > 0 &&
                visibleTargets.every((target) => pendingTargets.includes(target.id))
                  ? "ยกเลิกที่ค้นหาทั้งหมด"
                  : "เลือกที่ค้นหาทั้งหมด"}
              </button>
            </div>

            <div
              aria-label={`${targetType} options`}
              className="mt-3 grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3"
              role="group"
            >
              {visibleTargets.map((target) => {
                const selected = pendingTargets.includes(target.id);
                return (
                  <label
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                    key={target.id}
                  >
                    <input
                      checked={selected}
                      className="size-4 accent-emerald-600"
                      onChange={() => toggleTarget(target.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0 truncate" title={target.label}>
                      {target.label}
                    </span>
                  </label>
                );
              })}
              {!visibleTargets.length ? (
                <p className="col-span-full py-8 text-center text-sm text-slate-500">
                  ไม่พบ {targetType} ที่ค้นหา
                </p>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <p className="text-sm text-slate-600">
                เลือกแล้ว <strong className="text-slate-950">{pendingTargets.length}</strong>{" "}
                รายการ
              </p>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!pendingTargets.length}
                onClick={addTargets}
                type="button"
              >
                <Plus aria-hidden="true" size={18} />
                เพิ่ม {pendingTargets.length || ""} รายการไป Week {pendingWeek}
              </button>
            </div>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-2 text-slate-900">
        <p className="text-sm text-slate-600">เลือก Week เพื่อเพิ่ม ลบ หรือแก้รายการ</p>
        <p className="text-sm font-bold text-slate-700">
          ตั้งค่าแล้ว {configuredWeeks} / 5 Weeks
        </p>
      </div>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200" data-pm-pattern-week-grid>
        {weekNumbers.map((weekNumber) => (
          <WeekCard
            items={items}
            key={weekNumber}
            modes={modes}
            onAdd={appendTargets}
            targets={targets}
            targetType={targetType}
            onRemove={(key) =>
              setItems((current) => current.filter((item) => item.key !== key))
            }
            onReorder={reorder}
            onSetNoPm={setNoPm}
            onRepeatWeekOne={() => { setModes(current => ({ ...current, 5: "REPEAT_WEEK_1" })); setItems(current => current.filter(item => item.weekNumber !== 5)); }}
            onUpdate={updateItem}
            targetLabels={targetLabels}
            weekNumber={weekNumber}
          />
        ))}
      </div>

      <input type="hidden" name="monthlyWeek5Rule" value={modes[5] === "REPEAT_WEEK_1" ? "REPEAT_WEEK_1" : "NO_PM"} />
      {items.map((item, index) => (
        <input
          key={`hidden:${item.key}`}
          name="monthlyPattern"
          type="hidden"
          value={`${item.weekNumber}:${item.dayOfWeek}:${index}:${item.targetId}`}
        />
      ))}
    </div>
  );
}

function WeekCard({
  items,
  modes,
  onAdd,
  targets,
  targetType,
  onRemove,
  onReorder,
  onSetNoPm,
  onRepeatWeekOne,
  onUpdate,
  targetLabels,
  weekNumber,
}: {
  items: Item[];
  modes: Record<number, string>;
  onAdd: (weekNumber: number, dayOfWeek: number, targetIds: string[]) => void;
  targets: Target[];
  targetType: string;
  onRemove: (key: string) => void;
  onReorder: (key: string, direction: -1 | 1) => void;
  onSetNoPm: (weekNumber: number, noPm: boolean) => void;
  onRepeatWeekOne: () => void;
  onUpdate: (
    key: string,
    values: Partial<Pick<Item, "weekNumber" | "dayOfWeek" | "targetId">>,
  ) => void;
  targetLabels: Map<string, string>;
  weekNumber: number;
}) {
  const weekItems = items.filter((item) => item.weekNumber === weekNumber);
  const noPm = modes[weekNumber] === "NO_PM";
  const repeat = modes[weekNumber] === "REPEAT_WEEK_1";
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(weekNumber === 1);
  // A reload can display server HTML before React attaches the accordion handler.
  // Keep its trigger disabled until hydration so the first click is not lost.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  return (
    <section aria-label={`Pattern Week ${weekNumber}`} data-pm-pattern-week={weekNumber} className="min-w-0 overflow-hidden bg-white text-slate-900">
      {!repeat ? <input
        name="monthlyWeekMode"
        type="hidden"
        value={`${weekNumber}:${modes[weekNumber]}`}
      /> : null}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 ${expanded ? "border-b border-slate-200 bg-slate-50/60" : ""}`}>
        <button type="button" disabled={!hydrated} aria-expanded={expanded} aria-controls={`pm-pattern-week-body-${weekNumber}`} aria-label={`รายการ Week ${weekNumber}`} onClick={() => setExpanded(current => !current)} className="flex min-h-11 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-emerald-600">
          <ChevronDown aria-hidden="true" size={18} className={expanded ? "text-emerald-700" : "-rotate-90 text-slate-500"} />
          <div>
            <p className="font-extrabold">Week {weekNumber}</p>
            <p className="text-xs text-slate-500">
              {repeat ? "ตามรายการ Week 1" : noPm
                ? "กำหนดเป็น No PM"
                : weekItems.length
                  ? `${weekItems.length} PM Assignment`
                  : "ยังไม่ได้ตั้งค่า"}
            </p>
          </div>
        </button>
        <div
          aria-label={`Week ${weekNumber} mode`}
          className={`grid max-w-full ${weekNumber === 5 ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-2"} rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold sm:text-sm`}
          role="group"
        >
          <button
            aria-pressed={!noPm && !repeat}
            className={`min-h-11 rounded-lg px-2 sm:px-3 ${
              !noPm && !repeat ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => { onSetNoPm(weekNumber, false); setExpanded(true); }}
            type="button"
          >
            มี PM
          </button>
          {weekNumber === 5 ? <button type="button" aria-pressed={repeat} className={`min-h-11 rounded-lg px-2 sm:px-3 ${repeat ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`} onClick={onRepeatWeekOne}>ตาม Week 1</button> : null}
          <button
            aria-pressed={noPm}
            className={`min-h-11 rounded-lg px-2 sm:px-3 ${
              noPm ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => { onSetNoPm(weekNumber, true); setExpanded(true); }}
            type="button"
          >
            No PM
          </button>
        </div>
      </div>

      <div id={`pm-pattern-week-body-${weekNumber}`} className={expanded ? "grid gap-2 p-3 sm:p-4" : "hidden"}>
        {!noPm
          ? weekItems.map((item, index) => (
              <article
                className="grid min-w-0 gap-3 border-b border-slate-100 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center xl:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]"
                key={item.key}
              >
                <div className="min-w-0 sm:col-span-full xl:col-span-1">
                  <select aria-label={`เปลี่ยนเป้าหมาย ${targetLabels.get(item.targetId)} Week ${weekNumber} ลำดับ ${index + 1}`}
                    className="min-h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 font-bold text-slate-900"
                    value={item.targetId} onChange={event => onUpdate(item.key, { targetId: event.target.value })}>
                    {targets.filter(target => target.active || target.id === item.targetId).map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
                  </select>
                  <p className="mt-0.5 text-xs text-slate-500">ลำดับ {index + 1}</p>
                </div>
                <select
                  aria-label={`Move ${targetLabels.get(item.targetId)} to weekday`}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-slate-900"
                  onChange={(event) =>
                    onUpdate(item.key, { dayOfWeek: Number(event.target.value) })
                  }
                  value={item.dayOfWeek}
                >
                  {weekdays.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Move ${targetLabels.get(item.targetId)} to week`}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-slate-900"
                  onChange={(event) =>
                    onUpdate(item.key, { weekNumber: Number(event.target.value) })
                  }
                  value={item.weekNumber}
                >
                  {weekNumbers.map((value) => (
                    <option
                      disabled={modes[value] === "NO_PM" || modes[value] === "REPEAT_WEEK_1"}
                      key={value}
                      value={value}
                    >
                      Week {value}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-1">
                  <IconButton label={`Move ${targetLabels.get(item.targetId)} up`} onClick={() => onReorder(item.key, -1)}>
                    <ArrowUp aria-hidden="true" size={16} />
                  </IconButton>
                  <IconButton label={`Move ${targetLabels.get(item.targetId)} down`} onClick={() => onReorder(item.key, 1)}>
                    <ArrowDown aria-hidden="true" size={16} />
                  </IconButton>
                  <IconButton danger label={`Remove ${targetLabels.get(item.targetId)}`} onClick={() => onRemove(item.key)}>
                    <Trash2 aria-hidden="true" size={16} />
                  </IconButton>
                </div>
              </article>
            ))
          : null}
        {repeat ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">ใช้รายการต้นแบบ Week 1 เฉพาะวันที่มีครั้งที่ 5 จริง หรือกดเพิ่ม PM เพื่อกำหนด Week 5 เอง</p> : null}
        {!noPm && !repeat && !weekItems.length ? (
          <p className="px-4 py-2 text-sm text-slate-600">ยังไม่มีรายการ PM — เพิ่มได้ใน Week นี้</p>
        ) : null}
        {noPm ? (
          <div className="grid min-h-24 place-items-center rounded-xl bg-slate-50 px-4 text-center">
            <div>
              <p className="font-extrabold text-slate-700">No PM</p>
              <p className="mt-1 text-xs text-slate-500">
                ระบบจะไม่สร้าง PM สำหรับ Week {weekNumber}
              </p>
            </div>
          </div>
        ) : null}
        <>
          <button type="button" aria-expanded={adding && !noPm && !repeat} aria-controls={`pattern-week-add-${weekNumber}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            onClick={() => { if (noPm || repeat) { onSetNoPm(weekNumber, false); setAdding(true); } else setAdding(current => !current); }}><Plus size={17} aria-hidden="true" />{adding && !noPm && !repeat ? "ปิดช่องเพิ่ม" : `เพิ่ม PM ใน Week ${weekNumber}`}</button>
          {adding && !noPm && !repeat ? <WeekInlineComposer weekNumber={weekNumber} targetType={targetType} targets={targets} items={weekItems} onAdd={onAdd} /> : null}
        </>
      </div>
    </section>
  );
}

function WeekInlineComposer({ weekNumber, targetType, targets, items, onAdd }: {
  weekNumber: number; targetType: string; targets: Target[]; items: Item[];
  onAdd: (weekNumber: number, dayOfWeek: number, targetIds: string[]) => void;
}) {
  const [day, setDay] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const available = targets.filter(target => target.active && !items.some(item => item.dayOfWeek === day && item.targetId === target.id));
  const visible = available.filter(target => target.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const selectedIds = selected.filter(id => available.some(target => target.id === id));
  const allVisible = visible.length > 0 && visible.every(target => selectedIds.includes(target.id));
  return <div id={`pattern-week-add-${weekNumber}`} className="grid min-w-0 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
    <p className="text-sm font-extrabold">เพิ่มรายการใน Week {weekNumber}</p>
    <label className="grid gap-1 text-sm font-bold">วันที่ดำเนินการ<select aria-label={`วันเพิ่ม PM Week ${weekNumber}`} className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm" value={day} onChange={event => { setDay(Number(event.target.value)); setSelected([]); }}>
      {weekdays.map(weekday => <option key={weekday.value} value={weekday.value}>{weekday.label}</option>)}
    </select></label>
    <label className="grid gap-1 text-sm font-bold">ค้นหา {targetType}<input type="search" aria-label={`ค้นหาเป้าหมาย Pattern Week ${weekNumber}`} className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder={`ค้นหา ${targetType}...`} /></label>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>ไม่แสดงรายการที่มีแล้วในวันที่เลือก</span><button type="button" disabled={!visible.length} className="min-h-11 px-2 font-bold text-emerald-700 disabled:opacity-40" onClick={() => setSelected(current => allVisible ? current.filter(id => !visible.some(target => target.id === id)) : Array.from(new Set([...current, ...visible.map(target => target.id)])))}>{allVisible ? "ยกเลิกที่ค้นหาทั้งหมด" : "เลือกที่ค้นหาทั้งหมด"}</button></div>
    <div role="group" aria-label={`เลือก PM Pattern Week ${weekNumber}`} className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
      {visible.map(target => <label key={target.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><input type="checkbox" checked={selectedIds.includes(target.id)} onChange={() => setSelected(current => current.includes(target.id) ? current.filter(id => id !== target.id) : [...current, target.id])} className="size-4 shrink-0 accent-emerald-600" /><span className="min-w-0 break-words">{target.label}</span></label>)}
      {!visible.length ? <p className="py-3 text-sm text-slate-500">ไม่มีเป้าหมายที่เพิ่มได้ในวันที่เลือกหรือไม่พบคำค้น</p> : null}
    </div>
    <button type="button" disabled={!selectedIds.length} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300" onClick={() => { onAdd(weekNumber, day, selectedIds); setSelected([]); }}>เพิ่ม {selectedIds.length || ""} รายการใน Week {weekNumber}</button>
  </div>;
}

function IconButton({
  children,
  danger = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`grid size-11 place-items-center rounded-lg border ${
        danger
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
