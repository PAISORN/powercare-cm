import { Urgency, WorkStatus, type Urgency as UrgencyValue, type WorkStatus as WorkStatusValue } from "../cm-work/cm-work-types";
import { parseCmDateFilter, type CmDateFilterInput, type ParsedCmDateFilter } from "../filters/cm-date-filter";

export type ReportFilter = {
  dateInput: CmDateFilterInput;
  dateFilter: ParsedCmDateFilter;
  status?: WorkStatusValue;
  categoryId?: string;
  zoneId?: string;
  urgency?: UrgencyValue;
  claimantId?: string;
  requester?: string;
  department?: string;
  machineName?: string;
  number?: string;
};

const validModes = new Set(["day", "range", "month", "year", "all"]);
const validStatuses = new Set<string>(Object.values(WorkStatus));
const validUrgencies = new Set<string>(Object.values(Urgency));

function read(params: URLSearchParams, key: string) {
  return params.get(key)?.trim() || undefined;
}

export function parseReportFilter(params: URLSearchParams, now = new Date()): ReportFilter {
  const rawMode = read(params, "mode");
  const dateInput: CmDateFilterInput = {
    mode: validModes.has(rawMode ?? "") ? (rawMode as CmDateFilterInput["mode"]) : "month",
    date: read(params, "date"),
    startDate: read(params, "startDate"),
    endDate: read(params, "endDate"),
    month: read(params, "month"),
    year: read(params, "year"),
  };

  let dateFilter: ParsedCmDateFilter;
  try {
    dateFilter = parseCmDateFilter(dateInput, now);
  } catch {
    dateInput.mode = "month";
    dateInput.date = undefined;
    dateInput.startDate = undefined;
    dateInput.endDate = undefined;
    dateInput.month = undefined;
    dateInput.year = undefined;
    dateFilter = parseCmDateFilter(dateInput, now);
  }

  const status = read(params, "status");
  const urgency = read(params, "urgency");

  return {
    dateInput,
    dateFilter,
    status: validStatuses.has(status ?? "") ? (status as WorkStatusValue) : undefined,
    categoryId: read(params, "categoryId"),
    zoneId: read(params, "zoneId"),
    urgency: validUrgencies.has(urgency ?? "") ? (urgency as UrgencyValue) : undefined,
    claimantId: read(params, "claimantId"),
    requester: read(params, "requester"),
    department: read(params, "department"),
    machineName: read(params, "machineName"),
    number: read(params, "number"),
  };
}

export function serializeReportFilter(filter: ReportFilter) {
  const params = new URLSearchParams();
  const dateEntries: [keyof CmDateFilterInput, string | undefined][] = [
    ["mode", filter.dateInput.mode],
    ["date", filter.dateInput.date],
    ["startDate", filter.dateInput.startDate],
    ["endDate", filter.dateInput.endDate],
    ["month", filter.dateInput.month],
    ["year", filter.dateInput.year],
  ];
  for (const [key, value] of dateEntries) if (value) params.set(key, value);

  for (const [key, value] of [
    ["status", filter.status],
    ["categoryId", filter.categoryId],
    ["zoneId", filter.zoneId],
    ["urgency", filter.urgency],
    ["claimantId", filter.claimantId],
    ["requester", filter.requester],
    ["department", filter.department],
    ["machineName", filter.machineName],
    ["number", filter.number],
  ] as const) {
    if (value) params.set(key, value);
  }

  return params.toString();
}

export function reportFilterSummary(filter: ReportFilter) {
  return {
    dateMode: filter.dateFilter.mode,
    start: filter.dateFilter.start?.toISOString() ?? null,
    endExclusive: filter.dateFilter.endExclusive?.toISOString() ?? null,
    status: filter.status ?? null,
    categoryId: filter.categoryId ?? null,
    zoneId: filter.zoneId ?? null,
    urgency: filter.urgency ?? null,
    claimantId: filter.claimantId ?? null,
    requester: filter.requester ?? null,
    department: filter.department ?? null,
    machineName: filter.machineName ?? null,
    number: filter.number ?? null,
  };
}
