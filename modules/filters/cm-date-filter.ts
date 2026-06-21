import { BANGKOK_TIME_ZONE, bangkokDayWindow } from "../../lib/date-time/bangkok-time";

export type CmDateFilterInput = {
  mode?: "day" | "range" | "month" | "year" | "all";
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  includeTerminal?: string;
};

export type ParsedCmDateFilter = {
  mode: NonNullable<CmDateFilterInput["mode"]>;
  start?: Date;
  endExclusive?: Date;
  bucket: "day" | "month";
  includeTerminal: boolean;
};

export function hasExplicitCmDateFilter(input: CmDateFilterInput) {
  return Boolean(input.mode || input.date || input.startDate || input.endDate || input.month || input.year);
}

function getBangkokCalendarNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function lastDateForPeriod(mode: "month" | "year", startDate: string) {
  if (mode === "month") {
    const [year, month] = startDate.split("-").map(Number);
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  }

  const [year] = startDate.split("-").map(Number);
  return new Date(Date.UTC(year, 12, 0)).toISOString().slice(0, 10);
}

export function parseCmDateFilter(input: CmDateFilterInput, now = new Date()): ParsedCmDateFilter {
  const mode = input.mode ?? "month";
  const includeTerminal = input.includeTerminal === "1";

  if (mode === "all") {
    return { mode, bucket: "month", includeTerminal };
  }

  const bangkokNow = getBangkokCalendarNow(now);
  const startDate =
    mode === "day"
      ? input.date ?? `${bangkokNow.year}-${bangkokNow.month}-${bangkokNow.day}`
      : mode === "range"
        ? input.startDate
        : mode === "month"
          ? `${input.month ?? `${bangkokNow.year}-${bangkokNow.month}`}-01`
          : `${input.year ?? bangkokNow.year}-01-01`;

  if (!startDate) throw new Error("Start date is required");

  const endDate =
    mode === "day"
      ? startDate
      : mode === "range"
        ? input.endDate
        : lastDateForPeriod(mode, startDate);

  if (!endDate) throw new Error("End date is required");
  if (endDate < startDate) throw new Error("End date must not be before start date");

  const start = bangkokDayWindow(startDate).start;
  const endExclusive = bangkokDayWindow(endDate).endExclusive;
  const dayCount = Math.ceil((endExclusive.getTime() - start.getTime()) / 86_400_000);

  return {
    mode,
    start,
    endExclusive,
    bucket: dayCount <= 31 ? "day" : "month",
    includeTerminal,
  };
}
