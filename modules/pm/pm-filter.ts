import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { PmResult, PmWorkStatus } from "./pm-types";

export const PmLifecycle = PmWorkStatus;
export type PmLifecycleValue = (typeof PmLifecycle)[keyof typeof PmLifecycle];

export type PmWorkFilter = {
  startDate?: string;
  endDate?: string;
  groupId?: string;
  assetId?: string;
  assigneeId?: string;
  lifecycle?: PmLifecycleValue;
  overdue: boolean;
  result?: (typeof PmResult)[keyof typeof PmResult];
  todayDateKey: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const lifecycleValues = new Set<string>(Object.values(PmLifecycle));
const resultValues = new Set<string>(Object.values(PmResult));

function read(params: URLSearchParams, key: string) {
  return params.get(key)?.trim() || undefined;
}

export function isPmDateKey(value: string | undefined): value is string {
  if (!value || !DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function parsePmWorkFilter(params: URLSearchParams, now = new Date()): PmWorkFilter {
  const rawStart = read(params, "startDate");
  const rawEnd = read(params, "endDate");
  const startDate = isPmDateKey(rawStart) ? rawStart : undefined;
  const endDate = isPmDateKey(rawEnd) ? rawEnd : undefined;
  const lifecycle = read(params, "lifecycle");
  const result = read(params, "result");
  return {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    groupId: read(params, "groupId"),
    assetId: read(params, "assetId"),
    assigneeId: read(params, "assigneeId"),
    lifecycle: lifecycleValues.has(lifecycle ?? "") ? lifecycle as PmLifecycleValue : undefined,
    overdue: read(params, "overdue") === "1",
    result: resultValues.has(result ?? "") ? result as PmWorkFilter["result"] : undefined,
    todayDateKey: getBangkokDateString(now),
  };
}

export function serializePmWorkFilter(filter: PmWorkFilter) {
  const params = new URLSearchParams();
  for (const [key, value] of [
    ["startDate", filter.startDate], ["endDate", filter.endDate], ["groupId", filter.groupId],
    ["assetId", filter.assetId], ["assigneeId", filter.assigneeId], ["lifecycle", filter.lifecycle],
    ["result", filter.result],
  ] as const) if (value) params.set(key, value);
  if (filter.overdue) params.set("overdue", "1");
  return params.toString();
}

export function pmWorkFilterSummary(filter: PmWorkFilter) {
  return {
    startDate: filter.startDate ?? null, endDate: filter.endDate ?? null,
    groupId: filter.groupId ?? null, assetId: filter.assetId ?? null,
    assigneeId: filter.assigneeId ?? null, lifecycle: filter.lifecycle ?? null,
    overdue: filter.overdue, result: filter.result ?? null, todayDateKey: filter.todayDateKey,
  };
}
