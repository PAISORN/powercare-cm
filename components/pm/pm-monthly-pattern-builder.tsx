"use client";

import { ArrowDown, ArrowUp, Check, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

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

const weekNumbers = [1, 2, 3, 4] as const;
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
        weeks.find((week) => week.weekNumber === weekNumber)?.mode ?? "ASSIGNMENTS",
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
      modes[weekNumber] === "NO_PM" ||
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
    setModes((current) => ({ ...current, [pendingWeek]: "ASSIGNMENTS" }));
    setItems((current) => {
      const keys = new Set(
        current.map((item) =>
          itemKey(item.weekNumber, item.dayOfWeek, item.targetId),
        ),
      );
      const additions = pendingTargets
        .filter((targetId) => !keys.has(itemKey(pendingWeek, pendingDay, targetId)))
        .map((targetId) => ({
          key: itemKey(pendingWeek, pendingDay, targetId),
          weekNumber: pendingWeek,
          dayOfWeek: pendingDay,
          targetId,
        }));
      return [...current, ...additions];
    });
    setPendingTargets([]);
    setQuery("");
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
    values: Partial<Pick<Item, "weekNumber" | "dayOfWeek">>,
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
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white text-slate-900 shadow-sm">
        <div className="grid gap-4 border-b border-[var(--line)] bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="text-base font-extrabold">ตั้งค่า Pattern ต้นแบบ</p>
            <p className="mt-1 text-sm text-slate-600">
              เลือกหลาย {targetType} จากจุดเดียว แล้วส่งไปยัง Week ที่ต้องการ
            </p>
            <div aria-label="Pattern progress" className="mt-3 flex flex-wrap gap-2">
              {weekNumbers.map((weekNumber) => {
                const count = items.filter(
                  (item) => item.weekNumber === weekNumber,
                ).length;
                const noPm = modes[weekNumber] === "NO_PM";
                const configured = noPm || count > 0;
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                      configured
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                    key={weekNumber}
                  >
                    {configured ? <Check aria-hidden="true" size={14} /> : null}
                    Week {weekNumber} · {noPm ? "No PM" : `${count} รายการ`}
                  </span>
                );
              })}
            </div>
          </div>
          <label className="grid gap-1.5 text-sm font-bold">
            กรณีเดือนมี Week 5
            <select
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
              defaultValue={initialWeek5Rule}
              name="monthlyWeek5Rule"
            >
              <option value="NO_PM">No PM</option>
              <option value="REPEAT_WEEK_1">Repeat Week 1</option>
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
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] bg-white/95 p-4 text-slate-900 shadow-sm">
        <div>
          <p className="font-extrabold text-slate-950">ตรวจสอบรายการรายสัปดาห์</p>
          <p className="text-sm text-slate-600">
            ปรับวัน ย้ายสัปดาห์ หรือลำดับรายการได้ก่อนบันทึก Pattern
          </p>
        </div>
        <p className="text-sm font-bold text-slate-700">
          ตั้งค่าแล้ว {configuredWeeks} / 4 Weeks
        </p>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {weekNumbers.map((weekNumber) => (
          <WeekCard
            items={items}
            key={weekNumber}
            modes={modes}
            onFocusComposer={setPendingWeek}
            onRemove={(key) =>
              setItems((current) => current.filter((item) => item.key !== key))
            }
            onReorder={reorder}
            onSetNoPm={setNoPm}
            onUpdate={updateItem}
            targetLabels={targetLabels}
            weekNumber={weekNumber}
          />
        ))}
      </div>

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
  onFocusComposer,
  onRemove,
  onReorder,
  onSetNoPm,
  onUpdate,
  targetLabels,
  weekNumber,
}: {
  items: Item[];
  modes: Record<number, string>;
  onFocusComposer: (weekNumber: number) => void;
  onRemove: (key: string) => void;
  onReorder: (key: string, direction: -1 | 1) => void;
  onSetNoPm: (weekNumber: number, noPm: boolean) => void;
  onUpdate: (
    key: string,
    values: Partial<Pick<Item, "weekNumber" | "dayOfWeek">>,
  ) => void;
  targetLabels: Map<string, string>;
  weekNumber: number;
}) {
  const weekItems = items.filter((item) => item.weekNumber === weekNumber);
  const noPm = modes[weekNumber] === "NO_PM";
  const configured = noPm || weekItems.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white text-slate-900 shadow-sm">
      <input
        name="monthlyWeekMode"
        type="hidden"
        value={`${weekNumber}:${modes[weekNumber]}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-10 place-items-center rounded-xl text-sm font-black ${
              configured ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
            }`}
          >
            W{weekNumber}
          </span>
          <div>
            <p className="font-extrabold">Week {weekNumber}</p>
            <p className="text-xs text-slate-500">
              {noPm
                ? "กำหนดเป็น No PM"
                : weekItems.length
                  ? `${weekItems.length} PM Assignment`
                  : "ยังไม่ได้ตั้งค่า"}
            </p>
          </div>
        </div>
        <div
          aria-label={`Week ${weekNumber} mode`}
          className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 text-sm font-bold"
          role="group"
        >
          <button
            aria-pressed={!noPm}
            className={`min-h-9 rounded-lg px-3 ${
              !noPm ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => onSetNoPm(weekNumber, false)}
            type="button"
          >
            มี PM
          </button>
          <button
            aria-pressed={noPm}
            className={`min-h-9 rounded-lg px-3 ${
              noPm ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => onSetNoPm(weekNumber, true)}
            type="button"
          >
            No PM
          </button>
        </div>
      </div>

      <div className="grid gap-2 p-4">
        {!noPm
          ? weekItems.map((item, index) => (
              <article
                className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_8rem_auto] sm:items-center"
                key={item.key}
              >
                <div className="min-w-0">
                  <p
                    className="truncate font-bold"
                    title={targetLabels.get(item.targetId)}
                  >
                    {targetLabels.get(item.targetId) ?? item.targetId}
                  </p>
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
                      disabled={modes[value] === "NO_PM"}
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
        {!noPm && !weekItems.length ? (
          <button
            className="min-h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-600 hover:border-emerald-400 hover:bg-emerald-50"
            onClick={() => onFocusComposer(weekNumber)}
            type="button"
          >
            <Plus aria-hidden="true" className="mx-auto mb-1" size={18} />
            ยังไม่มีรายการ — เลือก Week {weekNumber} ในกล่องด้านบนเพื่อเพิ่ม PM
          </button>
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
      </div>
    </section>
  );
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
      className={`grid size-10 place-items-center rounded-lg border ${
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
