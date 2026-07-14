import { db } from "../../lib/db";
import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { WorkStatus } from "../cm-work/cm-work-types";
import { parseCmDateFilter, type ParsedCmDateFilter } from "../filters/cm-date-filter";
import type { ReportScope } from "./report-scope";

const dailyReportInclude = {
  category: true,
  zone: true,
  claimant: true,
} as const;

export type DailyReport = Awaited<ReturnType<typeof queryDailyReport>>;
export type DailyReportFilter = {
  mode: "range";
  startDate: string;
  endDate: string;
  categoryId?: string;
  dateFilter: ParsedCmDateFilter;
};

export async function queryDailyReport(filter: DailyReportFilter, scope?: ReportScope) {
  const window = filter.dateFilter;
  if (!window.start || !window.endExclusive) throw new Error("Daily report requires a date range");
  const categoryWhere = filter.categoryId ? { categoryId: filter.categoryId } : {};
  const scopeWhere = scope?.plantId ? { plantId: scope.plantId } : scope?.organizationId ? { organizationId: scope.organizationId } : {};
  const [newWorks, closedWorks] = await Promise.all([
    db.cmWork.findMany({
      where: { ...scopeWhere, ...categoryWhere, createdAt: { gte: window.start, lt: window.endExclusive } },
      include: dailyReportInclude,
      orderBy: { createdAt: "asc" },
    }),
    db.cmWork.findMany({
      where: {
        ...scopeWhere,
        ...categoryWhere,
        status: WorkStatus.CLOSED,
        closedAt: { gte: window.start, lt: window.endExclusive },
      },
      include: dailyReportInclude,
      orderBy: { closedAt: "asc" },
    }),
  ]);

  return {
    categoryId: filter.categoryId,
    endDate: filter.endDate,
    start: window.start,
    endExclusive: window.endExclusive,
    startDate: filter.startDate,
    newWorks,
    closedWorks,
    newCount: newWorks.length,
    closedCount: closedWorks.length,
  };
}

export function parseDailyReportFilter(params: URLSearchParams, now = new Date()): DailyReportFilter {
  const fallback = defaultDailyReportRange(now);
  const startDate = normalizeIsoDate(params.get("dailyStartDate")) ?? fallback.startDate;
  const endDate = normalizeIsoDate(params.get("dailyEndDate")) ?? fallback.endDate;
  const safeStartDate = endDate < startDate ? fallback.startDate : startDate;
  const safeEndDate = endDate < startDate ? fallback.endDate : endDate;

  return {
    mode: "range",
    startDate: safeStartDate,
    endDate: safeEndDate,
    categoryId: params.get("dailyCategoryId")?.trim() || undefined,
    dateFilter: parseCmDateFilter({ mode: "range", startDate: safeStartDate, endDate: safeEndDate }, now),
  };
}

export function defaultDailyReportRange(now = new Date()) {
  return { startDate: "2026-01-01", endDate: getBangkokDateString(now) };
}

function normalizeIsoDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
