"use client";

import type { CmDateFilterInput } from "../modules/filters/cm-date-filter";
import { getCmDatePreset } from "../modules/filters/cm-date-filter-presets";
import { CmDateRangePicker } from "./cm-date-range-picker";

type FilterMode = NonNullable<CmDateFilterInput["mode"]>;

export function CmDateFilterBar({
  defaultMode = "month",
  defaultDate = "",
  defaultStartDate = "",
  defaultEndDate = "",
  defaultMonth = "",
  defaultYear = "",
  initiallyUnset = false,
  now = new Date(),
}: {
  defaultMode?: FilterMode;
  defaultDate?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultMonth?: string;
  defaultYear?: string;
  initiallyUnset?: boolean;
  now?: Date;
}) {
  const pickerDefaults = resolvePickerDefaults({
    mode: defaultMode,
    date: defaultDate,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    month: defaultMonth,
    year: defaultYear,
    now,
  });

  return (
    <CmDateRangePicker
      defaultEndDate={pickerDefaults.endDate}
      defaultMode={pickerDefaults.mode}
      defaultStartDate={pickerDefaults.startDate}
      initiallyUnset={initiallyUnset}
      now={now}
    />
  );
}

function resolvePickerDefaults({
  mode,
  date,
  startDate,
  endDate,
  month,
  year,
  now,
}: {
  mode: FilterMode;
  date: string;
  startDate: string;
  endDate: string;
  month: string;
  year: string;
  now: Date;
}) {
  const monthToDate = getCmDatePreset("monthToDate", now);
  if (monthToDate.mode !== "range") throw new Error("Month-to-date preset must return a range");

  if (mode === "all") return { mode: "all" as const, startDate: monthToDate.startDate, endDate: monthToDate.endDate };
  if (mode === "day" && date) return { mode: "range" as const, startDate: date, endDate: date };
  if (mode === "range" && startDate && endDate) return { mode: "range" as const, startDate, endDate };

  if (mode === "month" && month) {
    const [selectedYear, selectedMonth] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
    return {
      mode: "range" as const,
      startDate: `${month}-01`,
      endDate: `${month}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  if (mode === "year" && year) {
    return { mode: "range" as const, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  return { mode: "range" as const, startDate: monthToDate.startDate, endDate: monthToDate.endDate };
}
