import { WorkStatus, statusLabels } from "../cm-work/cm-work-types";
import {
  hasExplicitCmDateFilter,
  parseCmDateFilter,
  type CmDateFilterInput,
} from "../filters/cm-date-filter";
import { toChartRows } from "./dashboard-chart-data";
import type { DashboardCategoryFilter } from "./dashboard-query";
import type { CmDashboardPageData } from "./dashboard-page-data";

export type DashboardSearchParams = {
  organizationId?: string;
  plantId?: string;
  category?: string;
  mode?: "day" | "range" | "month" | "year" | "all";
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  includeTerminal?: string;
  reportDate?: string;
};

export const dashboardStatusColors: Record<WorkStatus, string> = {
  [WorkStatus.NEW]: "#3b82f6",
  [WorkStatus.WAITING_TO_CLAIM]: "#f59e0b",
  [WorkStatus.CLAIMED]: "#14b8a6",
  [WorkStatus.IN_PROGRESS]: "#8b5cf6",
  [WorkStatus.BACKLOG_SHUTDOWN]: "#78716c",
  [WorkStatus.WAITING_TO_CLOSE]: "#ef4444",
  [WorkStatus.RETURNED_FOR_CORRECTION]: "#fb7185",
  [WorkStatus.CLOSED]: "#22c55e",
  [WorkStatus.CANCELED]: "#64748b",
};

const inProcessStatuses = [
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.BACKLOG_SHUTDOWN,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
];

export function resolveCmDashboardFilters(params: DashboardSearchParams) {
  const activeCategoryFilter = normalizeDashboardCategory(params.category);
  const activeDateFilterInput = readDateFilterInput(params);
  const hasExplicitDateFilter = hasExplicitCmDateFilter(activeDateFilterInput);

  return {
    activeCategoryFilter,
    activeDateFilterInput,
    hasExplicitDateFilter,
    activeDateFilter: hasExplicitDateFilter
      ? safeParseDateFilter(activeDateFilterInput)
      : undefined,
  };
}

export function buildCmDashboardPageModel(
  data: Pick<CmDashboardPageData, "summary" | "unreadSummary">,
) {
  const { summary, unreadSummary } = data;
  const statusCountByKey = new Map<WorkStatus, number>(
    summary.byStatus.map((item) => [item.status as WorkStatus, item.count]),
  );
  const statusRows = Object.values(WorkStatus).map((status) => ({
    status,
    label: statusLabels[status],
    value: statusCountByKey.get(status) ?? 0,
    color: dashboardStatusColors[status],
  }));
  const statusTotal = statusRows.reduce((sum, row) => sum + row.value, 0);
  const categoryTotal = summary.byCategory.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const topCategory = [...summary.byCategory].sort(
    (a, b) => b.count - a.count,
  )[0];

  return {
    statusRows,
    statusTotal,
    newCount: statusCountByKey.get(WorkStatus.NEW) ?? 0,
    closedCount: statusCountByKey.get(WorkStatus.CLOSED) ?? 0,
    canceledCount: statusCountByKey.get(WorkStatus.CANCELED) ?? 0,
    inProcessCount: inProcessStatuses.reduce(
      (sum, status) => sum + (statusCountByKey.get(status) ?? 0),
      0,
    ),
    waitingCloseCount: statusCountByKey.get(WorkStatus.WAITING_TO_CLOSE) ?? 0,
    recentMonthlyTrend: summary.monthlyTrend.slice(-6),
    latestActivities: buildLatestActivities(summary),
    topCategory,
    topCategoryPercent:
      topCategory && categoryTotal > 0
        ? Math.round((topCategory.count / categoryTotal) * 100)
        : 0,
    zoneRows: toChartRows(
      summary.byZone.map((item) => ({
        label: item.zoneName,
        count: item.count,
      })),
    ).sort((a, b) => b.count - a.count),
    workCategoryParam: summary.activeCategory
      ? `categoryId=${encodeURIComponent(summary.activeCategory.id)}`
      : "",
    unreadSummary,
  };
}

function buildLatestActivities(summary: CmDashboardPageData["summary"]) {
  return [
    ...summary.latestWorkActivities.map((activity) => ({
      id: activity.id,
      href: `/work/${activity.cmWork.id}`,
      kind: "cm" as const,
      number: activity.cmWork.number,
      title: activity.note?.trim() || activity.cmWork.problemTitle,
      status:
        statusLabels[activity.toStatus as WorkStatus] ?? activity.toStatus,
      occurredAt: activity.changedAt,
    })),
    ...summary.latestStoreIssues.map((issue) => ({
      id: issue.id,
      href: `/dashboardstore/tracking?number=${encodeURIComponent(issue.number)}`,
      kind: "store" as const,
      number: issue.number,
      title:
        issue.items.map((item) => item.sparePart.name).join(", ") ||
        issue.requesterName,
      status: formatStoreActivityStatus(issue.status),
      occurredAt: issue.updatedAt,
    })),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 10);
}

function normalizeDashboardCategory(
  value?: string,
): DashboardCategoryFilter | undefined {
  return value === "mechanical" || value === "electrical" ? value : undefined;
}

function readDateFilterInput(params: DashboardSearchParams): CmDateFilterInput {
  return {
    mode: params.mode,
    date: params.date,
    startDate: params.startDate,
    endDate: params.endDate,
    month: params.month,
    year: params.year,
    includeTerminal: params.includeTerminal,
  };
}

function safeParseDateFilter(input: CmDateFilterInput) {
  try {
    return parseCmDateFilter(input);
  } catch {
    return undefined;
  }
}

function formatStoreActivityStatus(status: string) {
  const labels: Record<string, string> = {
    WAITING_ENGINEER_APPROVAL: "รออนุมัติ",
    WAITING_STORE_ISSUE: "รอจ่ายอะไหล่",
    PARTIALLY_ISSUED: "จ่ายบางส่วน",
    ISSUED: "จ่ายแล้ว",
    RETURNED_FOR_EDIT: "ส่งกลับแก้ไข",
    NOT_ENOUGH_STOCK: "อะไหล่ไม่พอ",
    REJECTED: "ไม่อนุมัติ",
    CANCELED: "ยกเลิก",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}
