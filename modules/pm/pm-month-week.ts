import { nthWeekdayOfMonth } from "./pm-annual-types";

export function pmMonthWeekDates(year: number, month: number, week: number) {
  if (!Number.isInteger(week) || week < 1 || week > 5) throw new Error("Week must be 1 through 5");
  return Array.from({ length: 7 }, (_, index) => ({
    dayOfWeek: index + 1,
    date: nthWeekdayOfMonth(year, month, index + 1, week),
  })).filter((item): item is { dayOfWeek: number; date: string } => item.date !== null);
}

export type MonthWeekSchedule = {
  id: string; scheduleDateKey: string; status: string; slotKey: string | null;
  assetSystemId: string | null; zoneId: string | null; releasedAt: Date | string | null;
};

// A comparison token, not an authorization token. Re-read it inside the write transaction.
export function pmMonthWeekRevision(rows: MonthWeekSchedule[]) {
  return JSON.stringify(rows.map(row => [row.id, row.scheduleDateKey, row.status, row.slotKey,
    row.assetSystemId, row.zoneId, Boolean(row.releasedAt)]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}
