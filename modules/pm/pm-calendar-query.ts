import { db } from "../../lib/db";
import { bangkokDayWindow } from "../../lib/date-time/bangkok-time";
import { canViewPm } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

export type PmCalendarScope = { organizationId: string; plantId: string };

export function isIsoDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function isPmMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isoDateAtUtcNoon(value: string) {
  if (!isIsoDateKey(value)) throw new Error("A valid calendar date is required");
  return new Date(`${value}T12:00:00.000Z`);
}

export function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function monthStart(value: string) {
  const month = /^\d{4}-\d{2}$/.test(value) ? value : isIsoDateKey(value) ? value.slice(0, 7) : "";
  if (!isPmMonthKey(month)) throw new Error("A valid calendar month is required");
  return `${month}-01`;
}

export function addCalendarMonths(value: string, amount: number) {
  const date = isoDateAtUtcNoon(monthStart(value));
  return toIsoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12)));
}

export function addCalendarDays(value: string, amount: number) {
  const date = isoDateAtUtcNoon(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

export function pmMonthGrid(value: string) {
  const first = isoDateAtUtcNoon(monthStart(value));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - mondayOffset, 12));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return toIsoDate(date);
  });
}

function authorizeRead(actor: PermissionUserContext, scope: PmCalendarScope) {
  if (!canViewPm(actor)) throw new Error("You cannot view PM plans");
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId) throw new Error("PM plan scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) {
    throw new Error("PM plan scope is outside your Site");
  }
}

export async function listPmCalendarPlans(
  actor: PermissionUserContext,
  scope: PmCalendarScope,
  month: string,
) {
  authorizeRead(actor, scope);
  const dates = pmMonthGrid(month);
  // Use the approved Bangkok boundary helper as the canonical validation/conversion path.
  bangkokDayWindow(dates[0]);
  bangkokDayWindow(dates[dates.length - 1]);
  return db.pmPlan.findMany({
    where: {
      ...scope,
      plannedDateKey: { gte: dates[0], lte: dates[dates.length - 1] },
      status: { not: "CANCELED" },
    },
    select: {
      id: true, plannedDateKey: true, status: true, number: true,
      draftGroups: { select: { pmGroup: { select: { id: true, code: true, name: true } } } },
      groupSnapshots: { select: { id: true, codeSnapshot: true, nameSnapshot: true } },
      _count: { select: { works: true } },
    },
    orderBy: [{ plannedDateKey: "asc" }, { createdAt: "asc" }],
  });
}
