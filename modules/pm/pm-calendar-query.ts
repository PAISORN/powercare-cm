import { db } from "../../lib/db";
import { bangkokDayWindow } from "../../lib/date-time/bangkok-time";
import { canViewPm } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

export type PmCalendarScope = { organizationId: string; plantId: string };

export function isIsoDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return (
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) ===
    value
  );
}

export function isPmMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isoDateAtUtcNoon(value: string) {
  if (!isIsoDateKey(value))
    throw new Error("A valid calendar date is required");
  return new Date(`${value}T12:00:00.000Z`);
}

export function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function monthStart(value: string) {
  const month = /^\d{4}-\d{2}$/.test(value)
    ? value
    : isIsoDateKey(value)
      ? value.slice(0, 7)
      : "";
  if (!isPmMonthKey(month))
    throw new Error("A valid calendar month is required");
  return `${month}-01`;
}

export function addCalendarMonths(value: string, amount: number) {
  const date = isoDateAtUtcNoon(monthStart(value));
  return toIsoDate(
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12),
    ),
  );
}

export function addCalendarDays(value: string, amount: number) {
  const date = isoDateAtUtcNoon(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

export function pmMonthGrid(value: string) {
  const first = isoDateAtUtcNoon(monthStart(value));
  const sundayOffset = first.getUTCDay();
  const start = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - sundayOffset, 12),
  );
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return toIsoDate(date);
  });
}

function authorizeRead(actor: PermissionUserContext, scope: PmCalendarScope) {
  if (!canViewPm(actor)) throw new Error("You cannot view PM plans");
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId)
    throw new Error("PM plan scope is outside your Organization");
  if (
    actor.role !== RoleName.ORGANIZATION_ADMIN &&
    actor.plantId !== scope.plantId
  ) {
    throw new Error("PM plan scope is outside your Site");
  }
}

export type AnnualPmCalendarEntry = {
  id: string;
  planId: string;
  planStatus: string;
  scheduleDateKey: string;
  status: string;
  targetId: string;
  targetName: string;
  mainAssetCount: number;
  releasePmPlanId?: string | null;
  workTotal?: number;
  workCompleted?: number;
  assignees?: Array<{
    id: string;
    fullName: string;
    hasPhoto: boolean;
    photoVersion: number | null;
  }>;
};

export async function listAnnualPmCalendarEntries(
  actor: PermissionUserContext,
  scope: PmCalendarScope,
  month: string,
): Promise<AnnualPmCalendarEntry[]> {
  authorizeRead(actor, scope);
  const dates = pmMonthGrid(month);
  const years = [...new Set(dates.map((date) => Number(date.slice(0, 4))))];
  const annualPlans = await db.pmAnnualPlan.findMany({
    where: {
      ...scope,
      year: { in: years },
      status: { in: ["ACTIVE", "DRAFT"] },
    },
    select: { id: true, status: true },
  });
  if (!annualPlans.length) return [];
  const planStatus = new Map(annualPlans.map((plan) => [plan.id, plan.status]));
  const schedules = await db.pmAnnualSchedule.findMany({
    where: {
      planId: { in: annualPlans.map((plan) => plan.id) },
      scheduleDateKey: { gte: dates[0], lte: dates[dates.length - 1] },
      slotKey: { not: null },
      status: { in: ["SCHEDULED", "RELEASED"] },
    },
    select: {
      id: true,
      planId: true,
      scheduleDateKey: true,
      status: true,
      assetSystemId: true,
      zoneId: true,
      assetSystem: { select: { nameTh: true } },
      zone: { select: { name: true } },
      releaseSchedules: { select: { batch: { select: { pmPlanId: true } } } },
    },
    orderBy: [{ scheduleDateKey: "asc" }, { createdAt: "asc" }],
  });
  const systemIds = [
    ...new Set(
      schedules.flatMap((row) =>
        row.assetSystemId ? [row.assetSystemId] : [],
      ),
    ),
  ];
  const zoneIds = [
    ...new Set(schedules.flatMap((row) => (row.zoneId ? [row.zoneId] : []))),
  ];
  const releasedScheduleIds = schedules
    .filter((row) => row.releaseSchedules.length > 0)
    .map((row) => row.id);
  const [systemCounts, zoneCounts, workSourceRows] = await Promise.all([
    systemIds.length
      ? db.asset.groupBy({
          by: ["systemId"],
          where: {
            plantId: scope.plantId,
            registrationStatus: "ACTIVE",
            assetLevel: "MAIN_ASSET",
            systemId: { in: systemIds },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    zoneIds.length
      ? db.asset.groupBy({
          by: ["zoneId"],
          where: {
            plantId: scope.plantId,
            registrationStatus: "ACTIVE",
            assetLevel: "MAIN_ASSET",
            zoneId: { in: zoneIds },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    releasedScheduleIds.length
      ? db.pmAnnualWorkSource.findMany({
          where: { scheduleId: { in: releasedScheduleIds } },
          select: {
            scheduleId: true,
            pmWork: {
              select: {
                status: true,
                assignees: {
                  orderBy: [{ role: "asc" }, { assignedAt: "asc" }],
                  select: {
                    user: {
                      select: {
                        id: true,
                        fullName: true,
                        profilePhoto: { select: { updatedAt: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const counts = new Map<string, number>();
  for (const row of systemCounts)
    if (row.systemId) counts.set(row.systemId, row._count._all);
  for (const row of zoneCounts)
    if (row.zoneId) counts.set(row.zoneId, row._count._all);

  const assigneesBySchedule = new Map<
    string,
    NonNullable<AnnualPmCalendarEntry["assignees"]>
  >();
  const progressBySchedule = new Map<
    string,
    { total: number; completed: number }
  >();

  for (const row of workSourceRows) {
    const progress = progressBySchedule.get(row.scheduleId) ?? {
      total: 0,
      completed: 0,
    };
    progress.total += 1;
    if (row.pmWork.status === "COMPLETED") progress.completed += 1;
    progressBySchedule.set(row.scheduleId, progress);

    const assignees = assigneesBySchedule.get(row.scheduleId) ?? [];
    for (const assignment of row.pmWork.assignees) {
      if (!assignees.some((item) => item.id === assignment.user.id)) {
        assignees.push({
          id: assignment.user.id,
          fullName: assignment.user.fullName,
          hasPhoto: Boolean(assignment.user.profilePhoto),
          photoVersion:
            assignment.user.profilePhoto?.updatedAt.getTime() ?? null,
        });
      }
    }
    assigneesBySchedule.set(row.scheduleId, assignees);
  }

  return schedules.map((row) => {
    const targetId = row.assetSystemId ?? row.zoneId ?? row.id;
    return {
      id: row.id,
      planId: row.planId,
      planStatus: planStatus.get(row.planId) ?? "DRAFT",
      scheduleDateKey: row.scheduleDateKey,
      status: row.status,
      targetId,
      targetName: row.assetSystem?.nameTh ?? row.zone?.name ?? targetId,
      mainAssetCount: counts.get(targetId) ?? 0,
      releasePmPlanId: row.releaseSchedules?.[0]?.batch.pmPlanId ?? null,
      workTotal: progressBySchedule.get(row.id)?.total ?? 0,
      workCompleted: progressBySchedule.get(row.id)?.completed ?? 0,
      assignees: assigneesBySchedule.get(row.id) ?? [],
    };
  });
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
      id: true,
      plannedDateKey: true,
      status: true,
      number: true,
      draftGroups: {
        select: { pmGroup: { select: { id: true, code: true, name: true } } },
      },
      groupSnapshots: {
        select: { id: true, codeSnapshot: true, nameSnapshot: true },
      },
      annualReleaseBatch: { select: { id: true } },
      _count: { select: { works: true } },
    },
    orderBy: [{ plannedDateKey: "asc" }, { createdAt: "asc" }],
  });
}
