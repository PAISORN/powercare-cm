import { isIsoDateKey, isPmMonthKey } from "./pm-calendar-query";

export type PmCalendarView = "month" | "day";

export type PmCalendarQuery = {
  organizationId?: string;
  plantId?: string;
  month?: string;
  date?: string;
  planId?: string;
  annualPlanId?: string;
  scheduleId?: string;
  release?: string;
  view?: string;
  saved?: string;
  error?: string;
};

export function resolvePmCalendarPageState(
  query: PmCalendarQuery,
  today: string,
) {
  const selectedDate = validPmDate(query.date, today);
  const view = validPmCalendarView(query.view);
  const month =
    view === "day"
      ? `${selectedDate.slice(0, 7)}-01`
      : validPmMonth(query.month, `${today.slice(0, 7)}-01`);

  return { selectedDate, view, month };
}

export function validPmDate(value: string | undefined, fallback: string) {
  return value && isIsoDateKey(value) ? value : fallback;
}

export function validPmMonth(value: string | undefined, fallback: string) {
  return value && isPmMonthKey(value) ? `${value}-01` : fallback;
}

export function validPmCalendarView(value: string | undefined): PmCalendarView {
  return value === "day" ? "day" : "month";
}

export function pmErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save PM plan";
}

export function buildPmCalendarUrl(
  scope: {
    organization: { id: string };
    plant: { id: string };
    calendarView?: PmCalendarView;
  },
  values: Record<string, string | undefined>,
) {
  const params = new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  });
  if (scope.calendarView) params.set("view", scope.calendarView);
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/dashboardpm/calendar?${params}`;
}

export function buildPmScopeQuery(scope: {
  organization: { id: string };
  plant: { id: string };
}) {
  return new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  }).toString();
}
