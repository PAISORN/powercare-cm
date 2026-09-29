import { StoreIssueStatus } from "./store-types";

export const ISSUE_TRACKING_PAGE_SIZE = 50;

export const ISSUE_TRACKING_STATUSES = [
  "ALL",
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const;

export const ISSUE_ITEM_KINDS = ["SPARE_PART", "CHEMICAL", "OIL"] as const;

export type IssueTrackingStatus = (typeof ISSUE_TRACKING_STATUSES)[number];
export type IssueItemKind = (typeof ISSUE_ITEM_KINDS)[number];

export type IssueTrackingQuery = {
  search: string;
  status: IssueTrackingStatus;
  itemKind: IssueItemKind;
  page: number;
  inspectIssueId?: string;
};

export type IssueTrackingScope = {
  organizationId: string;
  plantId: string;
};

type QueryValue = string | string[] | undefined;
type IssueTrackingQuerySource = Partial<
  Record<
    "q" | "status" | "itemKind" | "trackingPage" | "inspectIssueId",
    QueryValue
  >
>;

export function parseIssueTrackingQuery(
  source: IssueTrackingQuerySource,
  defaultItemKind: IssueItemKind,
): IssueTrackingQuery {
  const requestedPage = Number.parseInt(
    readQueryValue(source, "trackingPage"),
    10,
  );
  const requestedStatus = readQueryValue(source, "status");
  const requestedItemKind = readQueryValue(source, "itemKind");
  const inspectIssueId = readQueryValue(source, "inspectIssueId").trim();

  return {
    search: readQueryValue(source, "q").trim(),
    status: ISSUE_TRACKING_STATUSES.includes(
      requestedStatus as IssueTrackingStatus,
    )
      ? (requestedStatus as IssueTrackingStatus)
      : "ALL",
    itemKind: ISSUE_ITEM_KINDS.includes(requestedItemKind as IssueItemKind)
      ? (requestedItemKind as IssueItemKind)
      : defaultItemKind,
    page:
      Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    ...(inspectIssueId ? { inspectIssueId } : {}),
  };
}

export function clampIssueTrackingPage(page: number, totalPages: number) {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

export function countIssueTrackingFilters(
  query: IssueTrackingQuery,
  defaultItemKind: IssueItemKind,
) {
  return (
    Number(Boolean(query.search)) +
    Number(query.status !== "ALL") +
    Number(query.itemKind !== defaultItemKind)
  );
}

export function buildIssueTrackingPageHref(
  scope: IssueTrackingScope,
  query: IssueTrackingQuery,
  page: number,
) {
  const params = issueTrackingSearchParams(scope, query);
  if (page > 1) params.set("trackingPage", String(page));
  return `/dashboardstore/issue?${params.toString()}#issue-tracking`;
}

export function buildIssueTrackingStatusHref(
  scope: IssueTrackingScope,
  query: IssueTrackingQuery,
  status: IssueTrackingStatus,
) {
  const params = issueTrackingSearchParams(scope, { ...query, status });
  return `/dashboardstore/issue?${params.toString()}#issue-tracking`;
}

export function buildIssueTrackingInspectHref(
  scope: IssueTrackingScope,
  query: IssueTrackingQuery,
  inspectIssueId?: string,
) {
  const params = issueTrackingSearchParams(scope, query);
  if (query.page > 1) params.set("trackingPage", String(query.page));
  if (inspectIssueId) params.set("inspectIssueId", inspectIssueId);
  return `/dashboardstore/issue?${params.toString()}`;
}

export function buildIssueTrackingPositionKey(scope: IssueTrackingScope) {
  return `store-issues:${scope.organizationId}:${scope.plantId}`;
}

export function issueTrackingStatusValues(
  status: IssueTrackingStatus,
): string[] | null {
  if (status === "WAITING") return [StoreIssueStatus.WAITING_ENGINEER_APPROVAL];
  if (status === "IN_PROGRESS") {
    return [
      StoreIssueStatus.WAITING_STORE_ISSUE,
      StoreIssueStatus.PARTIALLY_ISSUED,
      StoreIssueStatus.RETURNED_FOR_EDIT,
    ];
  }
  if (status === "COMPLETED") return [StoreIssueStatus.ISSUED];
  if (status === "CANCELED") {
    return [
      StoreIssueStatus.ENGINEER_REJECTED,
      StoreIssueStatus.NOT_ENOUGH_STOCK,
      StoreIssueStatus.STORE_REJECTED,
      StoreIssueStatus.CANCELED,
    ];
  }
  return null;
}

export function issueTrackingStatusGroup(status: string) {
  if (status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL) return "WAITING";
  if (
    [
      StoreIssueStatus.WAITING_STORE_ISSUE,
      StoreIssueStatus.PARTIALLY_ISSUED,
      StoreIssueStatus.RETURNED_FOR_EDIT,
    ].includes(status as never)
  ) {
    return "IN_PROGRESS";
  }
  if (status === StoreIssueStatus.ISSUED) return "COMPLETED";
  return "CANCELED";
}

function issueTrackingSearchParams(
  scope: IssueTrackingScope,
  query: Pick<IssueTrackingQuery, "search" | "status" | "itemKind">,
) {
  const params = new URLSearchParams({
    organizationId: scope.organizationId,
    plantId: scope.plantId,
    view: "tracking",
    itemKind: query.itemKind,
  });
  if (query.search) params.set("q", query.search);
  if (query.status !== "ALL") params.set("status", query.status);
  return params;
}

function readQueryValue(
  source: IssueTrackingQuerySource,
  key: keyof IssueTrackingQuerySource,
) {
  const value = source[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
