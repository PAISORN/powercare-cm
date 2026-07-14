"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const compactThaiDateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const fullThaiDateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const thaiMonthFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const weekDays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function isoDateAtUtcNoon(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function formatCompactThaiDate(value: string) {
  return compactThaiDateFormatter.format(isoDateAtUtcNoon(value));
}

function formatFullThaiDate(value: string) {
  return fullThaiDateFormatter.format(isoDateAtUtcNoon(value));
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function addMonths(value: string, amount: number) {
  const date = isoDateAtUtcNoon(monthStart(value));
  return toIsoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12)));
}

function monthGrid(value: string) {
  const first = isoDateAtUtcNoon(monthStart(value));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - mondayOffset, 12));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return toIsoDate(date);
  });
}

export function CmDateRangePicker({
  defaultMode = "range",
  defaultStartDate,
  defaultEndDate,
  fieldNames = { mode: "mode", startDate: "startDate", endDate: "endDate" },
  initiallyUnset = false,
  label = "ช่วงวันที่แสดงข้อมูล",
}: {
  defaultMode?: "range" | "all";
  defaultStartDate: string;
  defaultEndDate: string;
  fieldNames?: { mode: string; startDate: string; endDate: string };
  initiallyUnset?: boolean;
  label?: string;
  now?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [hasAppliedFilter, setHasAppliedFilter] = useState(!initiallyUnset);
  const [appliedStartDate, setAppliedStartDate] = useState(defaultStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultEndDate);
  const [draftStartDate, setDraftStartDate] = useState(defaultStartDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultEndDate);
  const [draftMode, setDraftMode] = useState<"range" | "all">(defaultMode);
  const [appliedMode, setAppliedMode] = useState<"range" | "all">(defaultMode);
  const [visibleMonth, setVisibleMonth] = useState(monthStart(defaultEndDate));
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const appliedDateRangeLabel =
    appliedMode === "all" ? "ทั้งหมด" : `${formatCompactThaiDate(appliedStartDate)} - ${formatCompactThaiDate(appliedEndDate)}`;

  const triggerLabel = hasAppliedFilter ? appliedDateRangeLabel : "Default dashboard periods";

  function openPicker() {
    setDraftMode(appliedMode);
    setDraftStartDate(appliedStartDate);
    setDraftEndDate(appliedEndDate);
    setVisibleMonth(monthStart(appliedEndDate));
    setAwaitingEnd(false);
    setOpen(true);
  }

  function selectCalendarDate(date: string) {
    setDraftMode("range");
    if (!awaitingEnd) {
      setDraftStartDate(date);
      setDraftEndDate(date);
      setAwaitingEnd(true);
      return;
    }

    if (date < draftStartDate) {
      setDraftStartDate(date);
      setDraftEndDate(date);
      return;
    }

    setDraftEndDate(date);
    setAwaitingEnd(false);
  }

  function applyDraft() {
    setAppliedMode(draftMode);
    if (draftMode === "range") {
      setAppliedStartDate(draftStartDate);
      setAppliedEndDate(draftEndDate);
    }
    setHasAppliedFilter(true);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative grid gap-1 text-sm font-semibold md:col-span-2 xl:col-span-1">
      <span className="text-[var(--muted)]">{label}</span>
      <button
        aria-expanded={open}
        className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-left text-[var(--ink)] outline-none"
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--primary)]" />
          <span className="truncate">{triggerLabel}</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>

      <input disabled={!hasAppliedFilter} name={fieldNames.mode} type="hidden" value={appliedMode} />
      <input disabled={!hasAppliedFilter} name={fieldNames.startDate} type="hidden" value={appliedStartDate} />
      <input disabled={!hasAppliedFilter} name={fieldNames.endDate} type="hidden" value={appliedEndDate} />

      {open ? (
        <div
          aria-label="เลือกช่วงวันที่"
          className="cm-date-picker-popover absolute left-1/2 top-full z-50 mt-2 w-[min(315px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl md:left-0 md:translate-x-0"
          role="dialog"
        >
          <div className="cm-date-picker-panel min-w-0 p-3">
              <CalendarMonth
                draftEndDate={draftEndDate}
                draftMode={draftMode}
                draftStartDate={draftStartDate}
                month={visibleMonth}
                showNext
                showPrevious
                onChangeMonth={(amount) => setVisibleMonth((current) => addMonths(current, amount))}
                onSelectDate={selectCalendarDate}
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  วันเริ่มต้น
                  <input
                    aria-label="วันเริ่มต้น"
                    className="cm-date-picker-input min-h-9 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm text-[var(--ink)]"
                    readOnly
                    type="text"
                    value={formatCompactThaiDate(draftStartDate)}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  วันสิ้นสุด
                  <input
                    aria-label="วันสิ้นสุด"
                    className="cm-date-picker-input min-h-9 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm text-[var(--ink)]"
                    readOnly
                    type="text"
                    value={formatCompactThaiDate(draftEndDate)}
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button className="cm-date-picker-action min-h-9 rounded-xl border border-[var(--line)] px-3 text-sm" type="button" onClick={() => setOpen(false)}>
                  ยกเลิก
                </button>
                <button className="cm-date-picker-action min-h-9 rounded-xl bg-[var(--primary)] px-3 text-sm text-white" type="button" onClick={applyDraft}>
                  ใช้ช่วงวันที่
                </button>
              </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CalendarMonth({
  month,
  draftMode,
  draftStartDate,
  draftEndDate,
  showPrevious = false,
  showNext = false,
  className = "",
  onChangeMonth,
  onSelectDate,
}: {
  month: string;
  draftMode: "range" | "all";
  draftStartDate: string;
  draftEndDate: string;
  showPrevious?: boolean;
  showNext?: boolean;
  className?: string;
  onChangeMonth: (amount: number) => void;
  onSelectDate: (date: string) => void;
}) {
  const monthKey = month.slice(0, 7);

  return (
    <section className={`cm-date-picker-month p-1.5 sm:p-2 ${className}`}>
      <div className="grid grid-cols-[32px_1fr_32px] items-center">
        {showPrevious ? (
          <button aria-label="เดือนก่อนหน้า" className="cm-date-picker-nav grid h-7 w-7 place-items-center rounded-full hover:bg-[var(--soft)]" type="button" onClick={() => onChangeMonth(-1)}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : (
          <span />
        )}
        <strong className="text-center text-sm text-[var(--ink)]">{thaiMonthFormatter.format(isoDateAtUtcNoon(month))}</strong>
        {showNext ? (
          <button aria-label="เดือนถัดไป" className="cm-date-picker-nav grid h-7 w-7 place-items-center rounded-full hover:bg-[var(--soft)]" type="button" onClick={() => onChangeMonth(1)}>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[10px] font-bold text-[var(--muted)]">
        {weekDays.map((day) => <span className="py-1.5" key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(month).map((date) => {
          const outsideMonth = date.slice(0, 7) !== monthKey;
          const inRange = draftMode === "range" && date >= draftStartDate && date <= draftEndDate;
          const isBoundary = draftMode === "range" && (date === draftStartDate || date === draftEndDate);
          const tone = isBoundary
            ? "rounded-xl bg-[var(--primary)] text-white"
            : inRange
              ? "bg-[var(--calendar-range-bg)] font-semibold text-[var(--calendar-range-ink)]"
              : outsideMonth
                ? "text-[var(--muted)] opacity-40"
                : "text-[var(--ink)] hover:bg-[var(--soft)]";

          return (
            <button
              aria-label={formatFullThaiDate(date)}
              aria-pressed={isBoundary}
              className={`cm-date-picker-day aspect-square min-h-7 text-[11px] transition-colors ${tone}`}
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
            >
              {Number(date.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </section>
  );
}
