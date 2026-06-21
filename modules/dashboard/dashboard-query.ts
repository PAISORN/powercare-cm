import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { BANGKOK_TIME_ZONE, bangkokDayWindow } from "../../lib/date-time/bangkok-time";
import { getAllCategories, getAllZones, getCachedDashboardSummary } from "../../lib/query-cache";
import { Urgency, WorkStatus } from "../cm-work/cm-work-types";
import type { ParsedCmDateFilter } from "../filters/cm-date-filter";
import { initialCategories } from "../master-data/seed-data";
import { buildMonthlyTrend } from "./dashboard-chart-data";

export type DashboardCategoryFilter = "electrical" | "mechanical";
export type DashboardTimeRangeFilter = "this-month" | "last-3-months" | "last-6-months";

const categoryNameByFilter: Record<DashboardCategoryFilter, string> = {
  electrical: initialCategories[0],
  mechanical: initialCategories[1],
};

type DashboardDateWindow = {
  start: Date;
  endExclusive: Date;
};

type DashboardTrendWindow = {
  start?: Date;
  endExclusive?: Date;
  monthCount?: number;
};

export function resolveDashboardSectionWindows(dateFilter: ParsedCmDateFilter | undefined, now = new Date()): {
  summary: DashboardDateWindow | null;
  trend: DashboardTrendWindow;
  priority: DashboardDateWindow | null;
} {
  if (dateFilter) {
    if (!dateFilter.start || !dateFilter.endExclusive) {
      return {
        summary: null,
        trend: { start: undefined, endExclusive: undefined, monthCount: undefined },
        priority: null,
      };
    }

    const window = { start: dateFilter.start, endExclusive: dateFilter.endExclusive };
    return {
      summary: window,
      trend: { ...window, monthCount: getTrendMonthCount(dateFilter, null) },
      priority: window,
    };
  }

  const bangkokParts = getBangkokCalendarParts(now);
  const summaryStart = bangkokDayWindow(`${bangkokParts.year}-01-01`).start;
  const trendStartMonth = new Date(Date.UTC(Number(bangkokParts.year), Number(bangkokParts.month) - 6, 1));
  const trendStart = bangkokDayWindow(
    `${trendStartMonth.getUTCFullYear()}-${String(trendStartMonth.getUTCMonth() + 1).padStart(2, "0")}-01`,
  ).start;

  return {
    summary: { start: summaryStart, endExclusive: now },
    trend: { start: trendStart, endExclusive: now, monthCount: 6 },
    priority: null,
  };
}

export function composePriorityQueue<T>(groups: {
  critical: T[];
  urgent: T[];
  statusPriority: T[];
}) {
  return [...groups.critical, ...groups.urgent, ...groups.statusPriority].slice(0, 5);
}

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

export async function getDashboardSummary(filter?: {
  category?: DashboardCategoryFilter;
  timeRange?: DashboardTimeRangeFilter;
}) {
  const summary = await getCachedDashboardSummary(filter?.category, filter?.timeRange);
  return reviveDashboardSummary(summary);
}

export async function getDashboardSummaryForDateFilter(filter?: {
  category?: DashboardCategoryFilter;
  dateFilter?: ParsedCmDateFilter;
}) {
  const summary = await loadDashboardSummary({
    category: filter?.category,
    dateFilter: filter?.dateFilter,
  });
  return reviveDashboardSummary(summary);
}

export async function loadDashboardSummary(filter?: {
  category?: DashboardCategoryFilter;
  timeRange?: DashboardTimeRangeFilter;
  dateFilter?: ParsedCmDateFilter;
}) {
  const activeCategoryName = filter?.category ? categoryNameByFilter[filter.category] : null;
  const categoryWhere: Prisma.CmWorkWhereInput = activeCategoryName ? { category: { name: activeCategoryName } } : {};
  const activeTimeRange = filter?.timeRange ? normalizeDashboardTimeRange(filter.timeRange) : undefined;
  const activeDateFilter = filter?.dateFilter;
  const timeWindow = activeTimeRange ? getDashboardTimeRangeWindow(activeTimeRange) : null;
  const now = new Date();
  const sectionWindows = activeTimeRange && timeWindow && !activeDateFilter
    ? {
        summary: { start: timeWindow.start, endExclusive: timeWindow.end },
        trend: { start: timeWindow.start, endExclusive: timeWindow.end, monthCount: timeWindow.monthCount },
        priority: { start: timeWindow.start, endExclusive: timeWindow.end },
      }
    : resolveDashboardSectionWindows(activeDateFilter, now);
  const summaryWhere: Prisma.CmWorkWhereInput = { ...categoryWhere, ...toCreatedAtWhere(sectionWindows.summary) };
  const trendWhere: Prisma.CmWorkWhereInput = { ...categoryWhere, ...toCreatedAtWhere(sectionWindows.trend) };
  const priorityBaseWhere: Prisma.CmWorkWhereInput = {
    ...categoryWhere,
    ...toCreatedAtWhere(sectionWindows.priority),
    status: { notIn: [WorkStatus.CLOSED, WorkStatus.CANCELED] },
  };
  const priorityInclude = {
    category: true,
    zone: true,
    claimant: { include: { profilePhoto: true } },
    statusHistory: { orderBy: { changedAt: "desc" as const }, take: 1 },
  } satisfies Prisma.CmWorkInclude;

  const [
    total,
    byStatus,
    byCategoryRaw,
    byZoneRaw,
    byUrgency,
    monthlyWorks,
    criticalWorks,
    urgentWorks,
    statusPriorityWorks,
    latest,
    closedWorks,
  ] = await Promise.all([
    db.cmWork.count({ where: summaryWhere }),
    db.cmWork.groupBy({ by: ["status"], where: summaryWhere, _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["categoryId"], where: summaryWhere, _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["zoneId"], where: summaryWhere, _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["urgency"], where: summaryWhere, _count: { _all: true } }),
    db.cmWork.findMany({ where: trendWhere, select: { createdAt: true, status: true } }),
    db.cmWork.findMany({
      take: 5,
      where: { ...priorityBaseWhere, urgency: Urgency.CRITICAL },
      orderBy: { createdAt: "asc" },
      include: priorityInclude,
    }),
    db.cmWork.findMany({
      take: 5,
      where: { ...priorityBaseWhere, urgency: Urgency.URGENT },
      orderBy: { createdAt: "asc" },
      include: priorityInclude,
    }),
    db.cmWork.findMany({
      take: 5,
      where: {
        ...priorityBaseWhere,
        urgency: { notIn: [Urgency.CRITICAL, Urgency.URGENT] },
        status: { in: [WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION] },
      },
      orderBy: { createdAt: "asc" },
      include: priorityInclude,
    }),
    db.cmWork.findMany({
      take: 10,
      where: summaryWhere,
      orderBy: { createdAt: "desc" },
      include: { category: true, zone: true },
    }),
    db.cmWork.findMany({
      where: { ...summaryWhere, closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    }),
  ]);

  const priorityWorks = composePriorityQueue({
    critical: criticalWorks,
    urgent: urgentWorks,
    statusPriority: statusPriorityWorks,
  });

  const [categories, zones] = await Promise.all([getAllCategories(), getAllZones()]);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));
  const zoneCountById = new Map(byZoneRaw.map((item) => [item.zoneId, item._count._all]));
  const activeCategory = activeCategoryName ? categories.find((category) => category.name === activeCategoryName) ?? null : null;

  return {
    total,
    activeCategory,
    activeTimeRange,
    activeDateFilter: activeDateFilter ?? null,
    byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    byCategory: byCategoryRaw.map((item) => ({ categoryName: categoryNameById.get(item.categoryId) ?? "-", count: item._count._all })),
    byZone: zones.map((zone) => ({ zoneName: zoneNameById.get(zone.id) ?? zone.name, count: zoneCountById.get(zone.id) ?? 0 })),
    byUrgency: byUrgency.map((item) => ({ urgency: item.urgency, count: item._count._all })),
    monthlyTrend: buildMonthlyTrend(
      monthlyWorks,
      getSectionTrendAnchor(sectionWindows.trend, now),
      getSectionTrendMonthCount(sectionWindows.trend, monthlyWorks, now),
    ),
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

function toCreatedAtWhere(window: { start?: Date; endExclusive?: Date } | null): Prisma.CmWorkWhereInput {
  if (!window?.start || !window.endExclusive) return {};
  return { createdAt: { gte: window.start, lt: window.endExclusive } };
}

function getSectionTrendAnchor(window: DashboardTrendWindow, now: Date) {
  return window.endExclusive ? new Date(window.endExclusive.getTime() - 1) : now;
}

function getSectionTrendMonthCount(
  window: DashboardTrendWindow,
  works: { createdAt: Date }[],
  now: Date,
) {
  if (window.monthCount) return window.monthCount;
  if (window.start && window.endExclusive) {
    return countBangkokCalendarMonths(window.start, new Date(window.endExclusive.getTime() - 1));
  }

  const earliest = works.reduce<Date | null>(
    (current, work) => (!current || work.createdAt < current ? work.createdAt : current),
    null,
  );
  return earliest ? countBangkokCalendarMonths(earliest, now) : 1;
}

function countBangkokCalendarMonths(start: Date, end: Date) {
  const [startYear, startMonth] = getBangkokMonthKey(start).split("-").map(Number);
  const [endYear, endMonth] = getBangkokMonthKey(end).split("-").map(Number);
  return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
}

function reviveDashboardSummary(summary: Awaited<ReturnType<typeof loadDashboardSummary>>) {
  return {
    ...summary,
    priorityWorks: summary.priorityWorks.map((work) => ({
      ...work,
      createdAt: ensureDate(work.createdAt),
      claimedAt: ensureNullableDate(work.claimedAt),
      inProgressAt: ensureNullableDate(work.inProgressAt),
      waitingToCloseAt: ensureNullableDate(work.waitingToCloseAt),
      closedAt: ensureNullableDate(work.closedAt),
      canceledAt: ensureNullableDate(work.canceledAt),
      statusHistory: work.statusHistory.map((entry) => ({
        ...entry,
        changedAt: ensureDate(entry.changedAt),
      })),
      claimant: work.claimant
        ? {
            ...work.claimant,
            createdAt: ensureDate(work.claimant.createdAt),
            updatedAt: ensureDate(work.claimant.updatedAt),
            profilePhoto: work.claimant.profilePhoto
              ? {
                  ...work.claimant.profilePhoto,
                  uploadedAt: ensureDate(work.claimant.profilePhoto.uploadedAt),
                  updatedAt: ensureDate(work.claimant.profilePhoto.updatedAt),
                }
              : null,
          }
        : null,
      category: {
        ...work.category,
        createdAt: ensureDate(work.category.createdAt),
        updatedAt: ensureDate(work.category.updatedAt),
      },
      zone: {
        ...work.zone,
        createdAt: ensureDate(work.zone.createdAt),
        updatedAt: ensureDate(work.zone.updatedAt),
      },
    })),
    latest: summary.latest.map((work) => ({
      ...work,
      createdAt: ensureDate(work.createdAt),
      claimedAt: ensureNullableDate(work.claimedAt),
      inProgressAt: ensureNullableDate(work.inProgressAt),
      waitingToCloseAt: ensureNullableDate(work.waitingToCloseAt),
      closedAt: ensureNullableDate(work.closedAt),
      canceledAt: ensureNullableDate(work.canceledAt),
      category: {
        ...work.category,
        createdAt: ensureDate(work.category.createdAt),
        updatedAt: ensureDate(work.category.updatedAt),
      },
      zone: {
        ...work.zone,
        createdAt: ensureDate(work.zone.createdAt),
        updatedAt: ensureDate(work.zone.updatedAt),
      },
    })),
    activeCategory: summary.activeCategory,
    activeDateFilter: summary.activeDateFilter,
  };
}

function ensureDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function ensureNullableDate(value: Date | string | null) {
  if (!value) return null;
  return ensureDate(value);
}

function getTrendMonthCount(dateFilter: ParsedCmDateFilter | undefined, timeWindow: { monthCount: number } | null) {
  if (dateFilter?.start && dateFilter.endExclusive) {
    const startKey = getBangkokMonthKey(dateFilter.start);
    const endKey = getBangkokMonthKey(new Date(dateFilter.endExclusive.getTime() - 1));
    const [startYear, startMonth] = startKey.split("-").map(Number);
    const [endYear, endMonth] = endKey.split("-").map(Number);
    return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
  }

  return timeWindow?.monthCount ?? 6;
}

function getBangkokMonthKey(value: Date) {
  const { year, month } = getBangkokCalendarParts(value);
  return `${year}-${month}`;
}

function getBangkokCalendarParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return { year, month };
}
