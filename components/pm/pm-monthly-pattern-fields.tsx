"use client";

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

export function PmMonthlyPatternFields({
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
        weeks.find((week) => week.weekNumber === weekNumber)?.mode ??
          "ASSIGNMENTS",
      ]),
    ),
  );
  const [pendingDays, setPendingDays] = useState<Record<number, number>>(() =>
    Object.fromEntries(weekNumbers.map((weekNumber) => [weekNumber, 1])),
  );
  const [pendingTargets, setPendingTargets] = useState<
    Record<number, string[]>
  >(() =>
    Object.fromEntries(weekNumbers.map((weekNumber) => [weekNumber, []])),
  );
  const targetLabels = useMemo(
    () => new Map(targets.map((target) => [target.id, target.label])),
    [targets],
  );
  const targetType = pmBy === "SYSTEM" ? "System" : "Zone / Area";

  function addTargets(weekNumber: number) {
    const dayOfWeek = pendingDays[weekNumber];
    const selected = pendingTargets[weekNumber];
    if (!selected.length) return;
    setItems((current) => {
      const keys = new Set(
        current.map((item) =>
          itemKey(item.weekNumber, item.dayOfWeek, item.targetId),
        ),
      );
      const additions = selected
        .filter(
          (targetId) => !keys.has(itemKey(weekNumber, dayOfWeek, targetId)),
        )
        .map((targetId) => ({
          key: itemKey(weekNumber, dayOfWeek, targetId),
          weekNumber,
          dayOfWeek,
          targetId,
        }));
      return [...current, ...additions];
    });
    setPendingTargets((current) => ({ ...current, [weekNumber]: [] }));
  }

  function setNoPm(weekNumber: number, noPm: boolean) {
    setModes((current) => ({
      ...current,
      [weekNumber]: noPm ? "NO_PM" : "ASSIGNMENTS",
    }));
    if (noPm)
      setItems((current) =>
        current.filter((item) => item.weekNumber !== weekNumber),
      );
  }

  function updateItem(
    key: string,
    values: Partial<Pick<Item, "weekNumber" | "dayOfWeek">>,
  ) {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...values };
        if (
          current.some(
            (other) =>
              other.key !== key &&
              other.weekNumber === next.weekNumber &&
              other.dayOfWeek === next.dayOfWeek &&
              other.targetId === next.targetId,
          )
        )
          return item;
        return {
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
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm font-bold sm:max-w-xs">
        Week 5 rule
        <select
          className="min-h-11 rounded-xl border bg-white px-3 text-slate-900"
          defaultValue={initialWeek5Rule}
          name="monthlyWeek5Rule"
        >
          <option value="NO_PM">No PM</option>
          <option value="REPEAT_WEEK_1">Repeat Week 1</option>
        </select>
      </label>
      <div className="grid gap-4 xl:grid-cols-2">
        {weekNumbers.map((weekNumber) => {
          const weekItems = items.filter(
            (item) => item.weekNumber === weekNumber,
          );
          const noPm = modes[weekNumber] === "NO_PM";
          return (
            <section
              className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4"
              key={weekNumber}
            >
              <input
                name="monthlyWeekMode"
                type="hidden"
                value={`${weekNumber}:${modes[weekNumber]}`}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold">Week {weekNumber}</p>
                  <p className="text-xs text-[var(--muted)]">
                    ครั้งที่ {weekNumber} ของ Weekday ที่เลือก
                  </p>
                </div>
                <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-bold text-slate-900">
                  <input
                    checked={noPm}
                    onChange={(event) =>
                      setNoPm(weekNumber, event.target.checked)
                    }
                    type="checkbox"
                  />
                  No PM
                </label>
              </div>
              {!noPm ? (
                <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
                    <select
                      aria-label={`Week ${weekNumber} weekday`}
                      className="min-h-11 rounded-xl border bg-white px-3 text-slate-900"
                      onChange={(event) =>
                        setPendingDays((current) => ({
                          ...current,
                          [weekNumber]: Number(event.target.value),
                        }))
                      }
                      value={pendingDays[weekNumber]}
                    >
                      {weekdays.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`Week ${weekNumber} ${targetType} multi select`}
                      className="min-h-28 rounded-xl border bg-white p-2 text-slate-900"
                      multiple
                      onChange={(event) =>
                        setPendingTargets((current) => ({
                          ...current,
                          [weekNumber]: Array.from(
                            event.target.selectedOptions,
                            (option) => option.value,
                          ),
                        }))
                      }
                      value={pendingTargets[weekNumber]}
                    >
                      {targets
                        .filter((target) => target.active)
                        .map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.label}
                          </option>
                        ))}
                    </select>
                    <button
                      className="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold text-white"
                      onClick={() => addTargets(weekNumber)}
                      type="button"
                    >
                      เพิ่ม
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {weekItems.map((item, index) => (
                      <article
                        className="grid gap-2 rounded-xl border bg-white p-3 text-slate-900 sm:grid-cols-[minmax(0,1fr)_9rem_8rem_auto] sm:items-center"
                        key={item.key}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {targetLabels.get(item.targetId) ?? item.targetId}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            ลำดับ {index + 1}
                          </p>
                        </div>
                        <select
                          aria-label={`Move ${targetLabels.get(item.targetId)} to weekday`}
                          className="min-h-10 rounded-lg border px-2 text-slate-900"
                          onChange={(event) =>
                            updateItem(item.key, {
                              dayOfWeek: Number(event.target.value),
                            })
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
                          className="min-h-10 rounded-lg border px-2 text-slate-900"
                          onChange={(event) =>
                            updateItem(item.key, {
                              weekNumber: Number(event.target.value),
                            })
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
                        <div className="flex gap-1">
                          <button
                            aria-label={`Move ${targetLabels.get(item.targetId)} up`}
                            className="size-10 rounded-lg border"
                            onClick={() => reorder(item.key, -1)}
                            type="button"
                          >
                            ↑
                          </button>
                          <button
                            aria-label={`Move ${targetLabels.get(item.targetId)} down`}
                            className="size-10 rounded-lg border"
                            onClick={() => reorder(item.key, 1)}
                            type="button"
                          >
                            ↓
                          </button>
                          <button
                            aria-label={`Remove ${targetLabels.get(item.targetId)}`}
                            className="min-h-10 rounded-lg border border-red-300 px-3 text-red-700"
                            onClick={() =>
                              setItems((current) =>
                                current.filter(
                                  (entry) => entry.key !== item.key,
                                ),
                              )
                            }
                            type="button"
                          >
                            ลบ
                          </button>
                        </div>
                      </article>
                    ))}
                    {!weekItems.length ? (
                      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-[var(--muted)]">
                        Not Configured — เพิ่ม Assignment หรือเลือก No PM
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mt-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-700">
                  Week {weekNumber} ตั้งใจไม่มี PM
                </p>
              )}
            </section>
          );
        })}
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
