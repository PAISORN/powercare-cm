import { BANGKOK_TIME_ZONE } from "../../lib/date-time/bangkok-time";
import { WorkStatus } from "../cm-work/cm-work-types";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type CountInput = {
  label: string;
  count: number;
};

export type ChartRow = CountInput & {
  percentage: number;
};

export type WorkDateInput = {
  createdAt: Date;
  status: string;
};

export type MonthlyTrendRow = {
  key: string;
  label: string;
  total: number;
  open: number;
  pending: number;
  statusCounts: Record<WorkStatus, number>;
};

export function toChartRows(items: CountInput[]): ChartRow[] {
  const max = Math.max(0, ...items.map((item) => item.count));
  return items.map((item) => ({
    ...item,
    percentage: max === 0 ? 0 : Math.round((item.count / max) * 100),
  }));
}

export function buildMonthlyTrend(works: WorkDateInput[], currentDate = new Date(), monthCount = 6): MonthlyTrendRow[] {
  const anchorParts = getBangkokYearMonth(currentDate);
  const anchor = new Date(Date.UTC(anchorParts.year, anchorParts.month - 1, 1));
  const buckets = Array.from({ length: monthCount }, (_, index) => {
    const monthOffset = index - (monthCount - 1);
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + monthOffset, 1));
    return {
      key: toMonthKey(date),
      label: `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
      total: 0,
      open: 0,
      pending: 0,
      statusCounts: createEmptyStatusCounts(),
    };
  });
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const work of works) {
    const key = toMonthKey(work.createdAt);
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (isWorkStatus(work.status)) bucket.statusCounts[work.status] += 1;
    if (isOpenWork(work.status)) bucket.open += 1;
    if (isPendingWork(work.status)) bucket.pending += 1;
  }

  return buckets;
}

function isOpenWork(status: string) {
  return status === WorkStatus.NEW || status === WorkStatus.WAITING_TO_CLAIM;
}

function isPendingWork(status: string) {
  return (
    status === WorkStatus.CLAIMED ||
    status === WorkStatus.IN_PROGRESS ||
    status === WorkStatus.BACKLOG_SHUTDOWN ||
    status === WorkStatus.WAITING_TO_CLOSE ||
    status === WorkStatus.RETURNED_FOR_CORRECTION
  );
}

function createEmptyStatusCounts(): Record<WorkStatus, number> {
  return {
    [WorkStatus.NEW]: 0,
    [WorkStatus.WAITING_TO_CLAIM]: 0,
    [WorkStatus.CLAIMED]: 0,
    [WorkStatus.IN_PROGRESS]: 0,
    [WorkStatus.BACKLOG_SHUTDOWN]: 0,
    [WorkStatus.WAITING_TO_CLOSE]: 0,
    [WorkStatus.RETURNED_FOR_CORRECTION]: 0,
    [WorkStatus.CLOSED]: 0,
    [WorkStatus.CANCELED]: 0,
  };
}

function isWorkStatus(status: string): status is WorkStatus {
  return Object.values(WorkStatus).includes(status as WorkStatus);
}

function toMonthKey(date: Date) {
  const { year, month } = getBangkokYearMonth(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getBangkokYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
  };
}
