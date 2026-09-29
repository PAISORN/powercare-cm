export const PmAnnualPlanStatus = { DRAFT: "DRAFT", ACTIVE: "ACTIVE", SUPERSEDED: "SUPERSEDED", CANCELED: "CANCELED" } as const;
export const PmAnnualBy = { SYSTEM: "SYSTEM", ZONE: "ZONE" } as const;
export const PmAnnualScheduleMode = { MANUAL: "MANUAL", WEEKLY_PATTERN: "WEEKLY_PATTERN" } as const;
export const PmAnnualScheduleSource = { MANUAL: "MANUAL", PATTERN: "PATTERN", OVERRIDE: "OVERRIDE" } as const;
export const PmAnnualScheduleStatus = { SCHEDULED: "SCHEDULED", MOVED: "MOVED", CANCELED: "CANCELED", RELEASED: "RELEASED" } as const;

export type PmAnnualPlanStatus = typeof PmAnnualPlanStatus[keyof typeof PmAnnualPlanStatus];
export type PmAnnualBy = typeof PmAnnualBy[keyof typeof PmAnnualBy];
export type PmAnnualScheduleMode = typeof PmAnnualScheduleMode[keyof typeof PmAnnualScheduleMode];

export function normalizeAnnualPlanName(value: string, year: number) {
  return value.trim() || `Annual PM Plan ${year}`;
}

export function validateAnnualYear(year: number, currentYear: number) {
  if (!Number.isInteger(year) || year < currentYear || year > currentYear + 20) throw new Error("Plan Year must be the current year or a future year");
  return year;
}

export function validateAnnualPlanChoice<T extends string>(value: string, choices: Record<string, T>, label: string): T {
  if (!Object.values(choices).includes(value as T)) throw new Error(`${label} is invalid`);
  return value as T;
}

export function isAnnualDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function requireDateInPlanYear(value: string, year: number) {
  if (!isAnnualDateKey(value) || Number(value.slice(0, 4)) !== year) throw new Error("Schedule date must be inside the Plan Year");
  return value;
}

export function targetSlotKey(planId: string, dateKey: string, pmBy: PmAnnualBy, targetId: string) {
  return `${planId}:${dateKey}:${pmBy}:${targetId}`;
}

export function weeklyPatternKey(planId: string, dayOfWeek: number, pmBy: PmAnnualBy, targetId: string, weekIndex = 1) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) throw new Error("Weekly Pattern day must be Monday through Sunday");
  if (weekIndex !== 1 && weekIndex !== 2) throw new Error("Weekly Pattern week must be A or B");
  return weekIndex === 1 ? `${planId}:${dayOfWeek}:${pmBy}:${targetId}` : `${planId}:${dayOfWeek}:2:${pmBy}:${targetId}`;
}

export function firstWeekMonday(year: number) {
  const first = new Date(Date.UTC(year, 0, 1));
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  return first.toISOString().slice(0, 10);
}

export function rotationWeekIndex(dateKey: string, cycleWeeks: number, anchorDateKey: string | null) {
  if (cycleWeeks === 1) return 1;
  if (cycleWeeks !== 2 || !anchorDateKey || !isAnnualDateKey(anchorDateKey) || isoWeekday(anchorDateKey) !== 1) {
    throw new Error("Two-week rotation needs a valid Monday for Week A");
  }
  if (!isAnnualDateKey(dateKey)) throw new Error("A valid schedule date is required");
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const weeks = Math.round((date.getTime() - new Date(`${anchorDateKey}T00:00:00Z`).getTime()) / 604800000);
  return ((weeks % 2) + 2) % 2 + 1;
}

export function effectivePatternWeekIndex(dateKey: string, cycleWeeks: number, anchorDateKey: string | null, alternateDays: ReadonlySet<number>) {
  const weekIndex = rotationWeekIndex(dateKey, cycleWeeks, anchorDateKey);
  return weekIndex === 2 && !alternateDays.has(isoWeekday(dateKey)) ? 1 : weekIndex;
}

export function isoWeekday(dateKey: string) {
  if (!isAnnualDateKey(dateKey)) throw new Error("A valid calendar date is required");
  const day = new Date(`${dateKey}T12:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function datesInYearForWeekday(year: number, dayOfWeek: number) {
  weeklyPatternKey("plan", dayOfWeek, PmAnnualBy.SYSTEM, "target");
  const dates: string[] = [];
  const date = new Date(Date.UTC(year, 0, 1, 12));
  while (date.getUTCFullYear() === year) {
    const key = date.toISOString().slice(0, 10);
    if (isoWeekday(key) === dayOfWeek) dates.push(key);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

export function annualDateRange(start: string, end: string, year: number) {
  requireDateInPlanYear(start, year);
  requireDateInPlanYear(end, year);
  if (start > end) throw new Error("Start date must not be after end date");
  const result: string[] = [];
  const cursor = new Date(`${start}T12:00:00.000Z`);
  while (cursor.toISOString().slice(0, 10) <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}