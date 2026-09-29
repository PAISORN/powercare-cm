import { WorkStatus } from "../cm-work/cm-work-types";
import { StoreIssueStatus } from "../store/store-types";
import type {
  ActivityBoardFilter,
  ActivityBoardItemType,
  ActivityFeedItem,
  ActivityPageQuery,
  ActivityScope,
  ActivityView,
  StoreIssueActivity,
  StoreSectionKey,
} from "./activity-types";

export function needsProgressUpdate(work: {
  status: string;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  createdAt: Date;
}) {
  if (
    work.status !== WorkStatus.CLAIMED &&
    work.status !== WorkStatus.IN_PROGRESS
  )
    return false;
  const anchor = work.inProgressAt ?? work.claimedAt ?? work.createdAt;
  return Date.now() - anchor.getTime() >= 24 * 60 * 60 * 1000;
}

export function buildStoreSections(input: {
  approvalIssues: StoreIssueActivity[];
  issueQueueIssues: StoreIssueActivity[];
  requesterFollowUpIssues: StoreIssueActivity[];
}) {
  return [
    {
      key: "approve" as const,
      title: "รอ Engineer อนุมัติ",
      issues: input.approvalIssues,
      emptyText: "ยังไม่มีใบเบิกที่รอ Engineer อนุมัติ",
    },
    {
      key: "issue" as const,
      title: "รอ Store จ่าย",
      issues: input.issueQueueIssues,
      emptyText: "ยังไม่มีใบเบิกที่รอ Store จ่าย",
    },
    {
      key: "follow-up" as const,
      title: "ส่งกลับให้แก้ไข / ของไม่พอ",
      issues: input.requesterFollowUpIssues,
      emptyText: "ยังไม่มีใบเบิกที่ถูกส่งกลับหรือแจ้งว่าอะไหล่ไม่พอ",
    },
  ].filter((section) => section.issues.length > 0);
}

export function storeFeedItem(
  issue: StoreIssueActivity,
  sectionKey: StoreSectionKey,
): ActivityFeedItem {
  const labels: Record<StoreSectionKey, string> = {
    approve: "รอ Engineer อนุมัติ",
    issue: "รอ Store จ่าย",
    "follow-up": "ส่งกลับ / ของไม่พอ",
  };
  return {
    kind: "store",
    key: `store-${sectionKey}-${issue.id}`,
    title: issue.number,
    subtitle: `${labels[sectionKey]} · ${issue.requesterName} · ${issue.items
      .map((item) => item.sparePart.code)
      .join(", ")}`,
    status: issue.status,
    occurredAt: issue.requestedAt,
    issue,
    sectionKey,
  };
}

export function resolveActivityBoardFilters(
  query: ActivityPageQuery,
): ActivityBoardFilter {
  const types: ActivityBoardFilter["type"][] = ["all", "cm", "store", "review"];
  return {
    page: Math.max(1, Number(query.activityPage ?? 1) || 1),
    search: String(query.activitySearch ?? "").trim(),
    sort: query.activitySort === "oldest" ? "oldest" : "latest",
    status: String(query.activityStatus ?? "all"),
    type: types.includes(query.activityType as ActivityBoardFilter["type"])
      ? (query.activityType as ActivityBoardFilter["type"])
      : "all",
  };
}

export function filterActivityBoardItems(
  items: ActivityFeedItem[],
  filters: ActivityBoardFilter,
) {
  const search = filters.search.toLowerCase();
  return items
    .filter(
      (item) =>
        filters.type === "all" || activityBoardType(item) === filters.type,
    )
    .filter(
      (item) => filters.status === "all" || item.status === filters.status,
    )
    .filter((item) => {
      if (!search) return true;
      const subject =
        item.kind === "work" ? item.work.machineName : item.issue.requesterName;
      return [item.title, item.subtitle, subject]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) =>
      filters.sort === "oldest"
        ? left.occurredAt.getTime() - right.occurredAt.getTime()
        : right.occurredAt.getTime() - left.occurredAt.getTime(),
    );
}

export function activityBoardType(
  item: ActivityFeedItem,
): ActivityBoardItemType {
  if (item.kind === "store") return "store";
  return item.status === WorkStatus.WAITING_TO_CLOSE ? "review" : "cm";
}

export function activityStatusLabel(status: string) {
  const labels: Record<string, string> = {
    [WorkStatus.NEW]: "งานใหม่",
    [WorkStatus.WAITING_TO_CLAIM]: "รอรับงาน",
    [WorkStatus.CLAIMED]: "รับงานแล้ว",
    [WorkStatus.IN_PROGRESS]: "กำลังดำเนินการ",
    [WorkStatus.WAITING_TO_CLOSE]: "รอตรวจรับ",
    [WorkStatus.RETURNED_FOR_CORRECTION]: "ส่งกลับให้แก้ไข",
    [WorkStatus.CLOSED]: "ปิดงานแล้ว",
    [WorkStatus.CANCELED]: "ยกเลิก",
    [WorkStatus.BACKLOG_SHUTDOWN]: "Backlog",
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รออนุมัติ",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอจ่าย",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับ",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
  };
  return labels[status] ?? status;
}

export function activityStatusPillClass(
  status: string,
  type: ActivityBoardItemType,
) {
  if (type === "store")
    return "border-violet-400/35 bg-violet-500/15 text-violet-500";
  if (status === WorkStatus.WAITING_TO_CLOSE)
    return "border-emerald-400/35 bg-emerald-500/15 text-emerald-500";
  if (status === WorkStatus.NEW)
    return "border-blue-400/35 bg-blue-500/15 text-blue-500";
  if (status === WorkStatus.IN_PROGRESS || status === WorkStatus.CLAIMED)
    return "border-cyan-400/35 bg-cyan-500/15 text-cyan-500";
  return "border-amber-400/35 bg-amber-500/15 text-amber-500";
}

export function activityFeedToneClass(
  status: string,
  kind: ActivityFeedItem["kind"],
) {
  if (kind === "store") return "activity-tone-violet";
  if (status === WorkStatus.NEW) return "activity-tone-blue";
  if (status === WorkStatus.WAITING_TO_CLAIM) return "activity-tone-amber";
  if (status === WorkStatus.CLAIMED || status === WorkStatus.IN_PROGRESS)
    return "activity-tone-cyan";
  if (status === WorkStatus.WAITING_TO_CLOSE || status === WorkStatus.CLOSED)
    return "activity-tone-green";
  if (status === WorkStatus.RETURNED_FOR_CORRECTION) return "activity-tone-red";
  if (status === WorkStatus.CANCELED || status === WorkStatus.BACKLOG_SHUTDOWN)
    return "activity-tone-slate";
  return "activity-tone-orange";
}

export function activityBoardRedirect(
  scope: ActivityScope,
  filters: ActivityBoardFilter,
) {
  return activityRedirect(scope, {
    activityPage: String(filters.page),
    activitySearch: filters.search,
    activitySort: filters.sort,
    activityStatus: filters.status,
    activityType: filters.type,
    activityView: "visual",
  });
}

export function activitySelectionHref(
  scope: ActivityScope,
  filters: ActivityBoardFilter | undefined,
  selectedActivity: string,
  activityView: ActivityView = "visual",
) {
  if (!filters || activityView === "current")
    return activityRedirect(scope, { activityView, selectedActivity });
  return activityRedirect(scope, {
    activityPage: String(filters.page),
    activitySearch: filters.search,
    activitySort: filters.sort,
    activityStatus: filters.status,
    activityType: filters.type,
    activityView,
    selectedActivity,
  });
}

export function activityCloseHref(
  scope: ActivityScope,
  filters: ActivityBoardFilter,
  activityView: ActivityView,
) {
  return activityView === "current"
    ? activityRedirect(scope, { activityView })
    : activityBoardRedirect(scope, filters);
}

export function activityRedirect(
  scope: ActivityScope,
  result: Record<string, string>,
) {
  return `/activities?${new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    ...result,
  })}`;
}
