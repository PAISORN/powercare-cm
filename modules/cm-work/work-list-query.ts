import type { Prisma } from "@prisma/client";
import { paginationWindow } from "../../lib/pagination-window";
import {
  parseCmDateFilter,
  type CmDateFilterInput,
  type ParsedCmDateFilter,
} from "../filters/cm-date-filter";
import { getCmDatePreset } from "../filters/cm-date-filter-presets";
import type { OperationalScope } from "../organization/user-plant-scope";
import { WorkStatus } from "./cm-work-types";

export type WorkSearchParams = CmDateFilterInput & {
  search?: string;
  status?: string;
  statusGroup?: string;
  categoryId?: string;
  zoneId?: string;
  urgency?: string;
  claimantId?: string;
  page?: string;
  editWorkId?: string;
};

export const IN_PROCESS_GROUP = "IN_PROCESS";
export const WORK_LIST_PAGE_SIZE = 50;

const inProcessStatuses = [
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.BACKLOG_SHUTDOWN,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
];

const sharedWorkFilterKeys = [
  "search",
  "categoryId",
  "zoneId",
  "urgency",
  "claimantId",
  "mode",
  "date",
  "startDate",
  "endDate",
  "month",
  "year",
] as const;

const pagedWorkFilterKeys = [
  ...sharedWorkFilterKeys,
  "status",
  "statusGroup",
] as const;

export type StatusDateInput = {
  status: string;
  createdAt: Date;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  waitingToCloseAt: Date | null;
  closedAt: Date | null;
  canceledAt: Date | null;
  statusHistory: { changedAt: Date }[];
};

export function getStatusDate(work: StatusDateInput) {
  switch (work.status) {
    case WorkStatus.NEW:
      return work.createdAt;
    case WorkStatus.CLAIMED:
      return work.claimedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.IN_PROGRESS:
      return work.inProgressAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.BACKLOG_SHUTDOWN:
      return work.statusHistory[0]?.changedAt ?? work.inProgressAt ?? work.createdAt;
    case WorkStatus.WAITING_TO_CLOSE:
      return work.waitingToCloseAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.CLOSED:
      return work.closedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.CANCELED:
      return work.canceledAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    default:
      return work.statusHistory[0]?.changedAt ?? work.createdAt;
  }
}

export function buildStatusFilterHref(
  filters: WorkSearchParams,
  status: WorkStatus,
) {
  const params = pickWorkParams(filters, sharedWorkFilterKeys);
  params.set("status", status);
  return `/work?${params.toString()}`;
}

export function buildWorkListHref(filters: WorkSearchParams) {
  return workHref(pickWorkParams(filters, [...pagedWorkFilterKeys, "page"]));
}

export function buildWorkEditHref(
  filters: WorkSearchParams,
  workId: string,
) {
  const params = pickWorkParams(filters, [...pagedWorkFilterKeys, "page"]);
  params.set("editWorkId", workId);
  return `/work?${params.toString()}#edit-work-drawer`;
}

export function buildPageHref(filters: WorkSearchParams, page: number) {
  const params = pickWorkParams(filters, pagedWorkFilterKeys);
  if (page > 1) params.set("page", String(page));
  return workHref(params);
}

export function workPageWindow(currentPage: number, totalPages: number) {
  return paginationWindow(currentPage, totalPages);
}

export function normalizePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function normalizeWorkFilters(params: WorkSearchParams): WorkSearchParams {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
      .filter(([, value]) => value),
  ) as WorkSearchParams;
}

export function buildWorkWhere(
  filters: WorkSearchParams,
  dateFilter: ParsedCmDateFilter,
  scope?: OperationalScope,
): Prisma.CmWorkWhereInput {
  const where: Prisma.CmWorkWhereInput = {};
  if (scope?.organizationId) where.organizationId = scope.organizationId;
  if (scope?.plantId) where.plantId = scope.plantId;
  if (filters.status) where.status = filters.status;
  else if (filters.statusGroup === IN_PROCESS_GROUP) {
    where.status = { in: inProcessStatuses };
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.zoneId) where.zoneId = filters.zoneId;
  if (filters.urgency) where.urgency = filters.urgency;
  if (filters.claimantId) where.claimantId = filters.claimantId;
  if (dateFilter.start && dateFilter.endExclusive) {
    where.createdAt = { gte: dateFilter.start, lt: dateFilter.endExclusive };
  }
  if (filters.search) {
    where.OR = [
      { number: { contains: filters.search } },
      { machineName: { contains: filters.search } },
      { requesterName: { contains: filters.search } },
      { requesterDepartment: { contains: filters.search } },
      { problemTitle: { contains: filters.search } },
    ];
  }
  return where;
}

export function buildWorkScopeWhere(
  scope?: OperationalScope,
): Prisma.CmWorkWhereInput {
  if (scope?.plantId) return { plantId: scope.plantId };
  if (scope?.organizationId) return { organizationId: scope.organizationId };
  return {};
}

export function safeParseDateFilter(
  input: CmDateFilterInput,
  hasExplicitDateFilter: boolean,
) {
  const yearToDate = getCmDatePreset("yearToDate");
  try {
    return parseCmDateFilter(hasExplicitDateFilter ? input : yearToDate);
  } catch {
    return parseCmDateFilter(yearToDate);
  }
}

function pickWorkParams(
  filters: WorkSearchParams,
  keys: readonly (keyof WorkSearchParams)[],
) {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

function workHref(params: URLSearchParams) {
  const query = params.toString();
  return query ? `/work?${query}` : "/work";
}
