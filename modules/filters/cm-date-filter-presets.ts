import { BANGKOK_TIME_ZONE } from "../../lib/date-time/bangkok-time";

export type CmDatePresetKey =
  | "last7"
  | "last14"
  | "last30"
  | "last3Months"
  | "last12Months"
  | "monthToDate"
  | "quarterToDate"
  | "yearToDate"
  | "all"
  | "custom";

export type CmDatePresetRange =
  | { mode: "all" }
  | { mode: "range"; startDate: string; endDate: string };

function getBangkokIsoDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return `${read("year")}-${read("month")}-${read("day")}`;
}

function addDays(isoDate: string, amount: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return shifted.toISOString().slice(0, 10);
}

function shiftMonths(isoDate: string, amount: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + amount, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const shifted = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(day, lastDay)));
  return shifted.toISOString().slice(0, 10);
}

export function getCmDatePreset(key: CmDatePresetKey, now = new Date()): CmDatePresetRange {
  if (key === "all") return { mode: "all" };

  const endDate = getBangkokIsoDate(now);
  const [year, month] = endDate.split("-").map(Number);
  let startDate = endDate;

  if (key === "last7") startDate = addDays(endDate, -6);
  if (key === "last14") startDate = addDays(endDate, -13);
  if (key === "last30") startDate = addDays(endDate, -29);
  if (key === "last3Months") startDate = addDays(shiftMonths(endDate, -3), 1);
  if (key === "last12Months") startDate = addDays(shiftMonths(endDate, -12), 1);
  if (key === "monthToDate") startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  if (key === "quarterToDate") {
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    startDate = `${year}-${String(quarterStartMonth).padStart(2, "0")}-01`;
  }
  if (key === "yearToDate") startDate = `${year}-01-01`;

  return { mode: "range", startDate, endDate };
}
