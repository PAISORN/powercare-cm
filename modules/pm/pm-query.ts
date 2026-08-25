import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { PmWorkFilter } from "./pm-filter";
import { PmResult, PmWorkStatus } from "./pm-types";

export type PmQueryScope = { organizationId: string; plantId: string };

export function isPmWorkOverdue(status: string, plannedDateKey: string, todayDateKey: string) {
  return (status === PmWorkStatus.PLANNED || status === PmWorkStatus.IN_PROGRESS) && plannedDateKey < todayDateKey;
}

export function buildPmWorkWhere(filter: PmWorkFilter, scope: PmQueryScope): Prisma.PmWorkWhereInput {
  const plannedDateKey = {
    ...(filter.startDate ? { gte: filter.startDate } : {}),
    ...(filter.endDate ? { lte: filter.endDate } : {}),
    ...(filter.overdue ? { lt: filter.todayDateKey } : {}),
  };
  return {
    plantId: scope.plantId,
    pmPlan: {
      organizationId: scope.organizationId,
      plantId: scope.plantId,
      ...(Object.keys(plannedDateKey).length ? { plannedDateKey } : {}),
    },
    ...(filter.groupId ? { sourceGroups: { some: { pmPlanGroupSnapshot: { sourcePmGroupId: filter.groupId } } } } : {}),
    ...(filter.assetId ? { assetId: filter.assetId } : {}),
    ...(filter.assigneeId ? { assignees: { some: { userId: filter.assigneeId } } } : {}),
    ...(filter.overdue ? { status: { in: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS] } } : filter.lifecycle ? { status: filter.lifecycle } : {}),
    ...(filter.result ? { result: filter.result } : {}),
  };
}

export const pmWorkListSelect = {
  id: true, number: true, assetId: true, assetCodeSnapshot: true, assetNameSnapshot: true,
  status: true, result: true, resultNote: true, startedAt: true, completedAt: true,
  asset: { select: { registrationStatus: true } },
  pmPlan: { select: { id: true, number: true, plannedDateKey: true } },
  assignees: { select: { role: true, user: { select: { id: true, fullName: true } } }, orderBy: [{ role: "asc" }, { assignedAt: "asc" }] },
  sourceGroups: { select: { pmPlanGroupSnapshot: { select: { sourcePmGroupId: true, codeSnapshot: true, nameSnapshot: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.PmWorkSelect;

export const PM_CSV_EXPORT_MAX_ROWS = 10_000;

export async function queryPmWorkExport(filter: PmWorkFilter, scope: PmQueryScope, limit = PM_CSV_EXPORT_MAX_ROWS) {
  const rows = await db.pmWork.findMany({ where: buildPmWorkWhere(filter, scope), select: pmWorkListSelect, orderBy: [{ pmPlan: { plannedDateKey: "asc" } }, { number: "asc" }], take: limit + 1 });
  return { exceeded: rows.length > limit, rows: rows.slice(0, limit) };
}

export async function queryPmWorkPage(filter: PmWorkFilter, scope: PmQueryScope, take = 100) {
  const where = buildPmWorkWhere(filter, scope);
  const rowsWhere = where;
  const scoped = { plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId, plantId: scope.plantId } } satisfies Prisma.PmWorkWhereInput;
  const todayPlan = { plannedDateKey: filter.todayDateKey };
  const overduePlan = { plannedDateKey: { lt: filter.todayDateKey } };
  const [rows, total, today, planned, inProgress, overdue, completed, abnormal] = await Promise.all([
    db.pmWork.findMany({ where: rowsWhere, select: pmWorkListSelect, orderBy: [{ pmPlan: { plannedDateKey: "asc" } }, { number: "asc" }], take }),
    db.pmWork.count({ where: rowsWhere }),
    db.pmWork.count({ where: { ...scoped, pmPlan: { ...scoped.pmPlan, ...todayPlan }, status: { not: PmWorkStatus.CANCELED } } }),
    db.pmWork.count({ where: { ...scoped, status: PmWorkStatus.PLANNED } }),
    db.pmWork.count({ where: { ...scoped, status: PmWorkStatus.IN_PROGRESS } }),
    db.pmWork.count({ where: { ...scoped, pmPlan: { ...scoped.pmPlan, ...overduePlan }, status: { in: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS] } } }),
    db.pmWork.count({ where: { ...scoped, status: PmWorkStatus.COMPLETED } }),
    db.pmWork.count({ where: { ...scoped, result: PmResult.ABNORMAL } }),
  ]);
  return { rows, total, summary: { today, planned, inProgress, overdue, completed, abnormal } };
}

export type PmWorkQueryRow = Prisma.PmWorkGetPayload<{ select: typeof pmWorkListSelect }>;
