import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { Urgency, WorkStatus } from "../cm-work/cm-work-types";
import { initialCategories } from "../master-data/seed-data";
import { buildMonthlyTrend } from "./dashboard-chart-data";

export type DashboardCategoryFilter = "electrical" | "mechanical";
export type DashboardTimeRangeFilter = "this-month" | "last-3-months" | "last-6-months";

const categoryNameByFilter: Record<DashboardCategoryFilter, string> = {
  electrical: initialCategories[0],
  mechanical: initialCategories[1],
};

export function normalizeDashboardTimeRange(value?: string): DashboardTimeRangeFilter | undefined {
  return value === "this-month" || value === "last-3-months" || value === "last-6-months" ? value : undefined;
}

export function getDashboardTimeRangeWindow(timeRange: DashboardTimeRangeFilter, currentDate = new Date()) {
  const anchor = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
  const monthCountByRange: Record<DashboardTimeRangeFilter, number> = {
    "this-month": 1,
    "last-3-months": 3,
    "last-6-months": 6,
  };
  const monthCount = monthCountByRange[timeRange];

  return {
    start: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (monthCount - 1), 1)),
    end: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1)),
    monthCount,
  };
}

export async function getDashboardSummary(filter?: { category?: DashboardCategoryFilter; timeRange?: DashboardTimeRangeFilter }) {
  const activeCategoryName = filter?.category ? categoryNameByFilter[filter.category] : null;
  const categoryWhere: Prisma.CmWorkWhereInput = activeCategoryName ? { category: { name: activeCategoryName } } : {};
  const activeTimeRange = filter?.timeRange ? normalizeDashboardTimeRange(filter.timeRange) : undefined;
  const timeWindow = activeTimeRange ? getDashboardTimeRangeWindow(activeTimeRange) : null;
  const timeWhere: Prisma.CmWorkWhereInput = timeWindow ? { createdAt: { gte: timeWindow.start, lt: timeWindow.end } } : {};
  const dashboardWhere: Prisma.CmWorkWhereInput = { ...categoryWhere, ...timeWhere };
  const [total, byStatus, byCategoryRaw, byZoneRaw, byUrgency, monthlyWorks, priorityWorks, latest, closedWorks] = await Promise.all([
    db.cmWork.count({ where: dashboardWhere }),
    db.cmWork.groupBy({ by: ["status"], where: dashboardWhere, _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["categoryId"], where: dashboardWhere, _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["zoneId"], where: dashboardWhere, _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["urgency"], where: dashboardWhere, _count: { _all: true } }),
    db.cmWork.findMany({ where: dashboardWhere, select: { createdAt: true, status: true } }),
    db.cmWork.findMany({
      take: 8,
      where: {
        ...dashboardWhere,
        OR: [
          { urgency: Urgency.CRITICAL },
          { urgency: Urgency.URGENT },
          { status: WorkStatus.WAITING_TO_CLOSE },
          { status: WorkStatus.RETURNED_FOR_CORRECTION },
        ],
        status: { notIn: [WorkStatus.CLOSED, WorkStatus.CANCELED] },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
      include: {
        category: true,
        zone: true,
        claimant: { include: { profilePhoto: true } },
        statusHistory: { orderBy: { changedAt: "desc" }, take: 1 },
      },
    }),
    db.cmWork.findMany({
      take: 10,
      where: dashboardWhere,
      orderBy: { createdAt: "desc" },
      include: { category: true, zone: true },
    }),
    db.cmWork.findMany({
      where: { ...dashboardWhere, closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    }),
  ]);

  const [categories, zones] = await Promise.all([db.category.findMany(), db.zone.findMany()]);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));
  const zoneCountById = new Map(byZoneRaw.map((item) => [item.zoneId, item._count._all]));
  const activeCategory = activeCategoryName ? categories.find((category) => category.name === activeCategoryName) ?? null : null;

  return {
    total,
    activeCategory,
    activeTimeRange,
    byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    byCategory: byCategoryRaw.map((item) => ({ categoryName: categoryNameById.get(item.categoryId) ?? "-", count: item._count._all })),
    byZone: zones.map((zone) => ({ zoneName: zoneNameById.get(zone.id) ?? zone.name, count: zoneCountById.get(zone.id) ?? 0 })),
    byUrgency: byUrgency.map((item) => ({ urgency: item.urgency, count: item._count._all })),
    monthlyTrend: buildMonthlyTrend(monthlyWorks, new Date(), timeWindow?.monthCount ?? 6),
    priorityWorks,
    latest,
    avgCloseDays: calculateAverageCloseDays(closedWorks),
  };
}

function calculateAverageCloseDays(works: { createdAt: Date; closedAt: Date | null }[]) {
  const closedDurations = works
    .filter((work): work is { createdAt: Date; closedAt: Date } => Boolean(work.closedAt))
    .map((work) => work.closedAt.getTime() - work.createdAt.getTime())
    .filter((duration) => duration >= 0);

  if (!closedDurations.length) return 0;
  const averageMs = closedDurations.reduce((sum, duration) => sum + duration, 0) / closedDurations.length;
  return Math.round((averageMs / 86_400_000) * 10) / 10;
}
