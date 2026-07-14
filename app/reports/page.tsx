import { AppShell } from "../../components/app-shell";
import { getActiveCategoriesForPlantScope, getActiveClaimantsForReportScope, getActiveZonesForReportScope } from "../../lib/query-cache";
import { requireUser } from "../../lib/session";
import { canExportReports, canViewReports } from "../../modules/auth/permission";
import { parseDailyReportFilter } from "../../modules/reports/daily-report";
import { parseReportFilter, type ReportFilter } from "../../modules/reports/report-filter";
import { queryReportPreview } from "../../modules/reports/report-query";
import { buildReportScope } from "../../modules/reports/report-scope";
import { queryDailyReport } from "../../modules/reports/daily-report";
import { CmReportSection, ReportAccessDenied } from "./report-page-parts";

type ReportSearchParams = Record<string, string | undefined>;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  const user = await requireUser();
  const canView = canViewReports(user);
  const canExport = canExportReports(user);

  if (!canView) return <ReportAccessDenied />;

  const rawParams = await searchParams;
  const filter = parseReportFilter(toUrlSearchParams(rawParams));
  const dailyFilter = buildDailyReportFilter(filter);
  const scope = buildReportScope(user);
  const [{ rows, total }, dailyReport, categories, zones, claimants] = await Promise.all([
    queryReportPreview(filter, 50, scope),
    queryDailyReport(dailyFilter, scope),
    getActiveCategoriesForPlantScope(scope.plantId, scope.organizationId ?? user.organizationId),
    getActiveZonesForReportScope(scope),
    getActiveClaimantsForReportScope(scope),
  ]);

  return (
    <AppShell>
      <CmReportSection
        canExport={canExport}
        categories={categories}
        claimants={claimants}
        dailyReport={dailyReport}
        filter={filter}
        rows={rows}
        total={total}
        zones={zones}
      />
    </AppShell>
  );
}

function toUrlSearchParams(values: ReportSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params;
}

function buildDailyReportFilter(filter: ReportFilter) {
  const params = new URLSearchParams();
  const { mode, date, startDate, endDate, month, year } = filter.dateInput;

  if (mode === "day" && date) {
    params.set("dailyStartDate", date);
    params.set("dailyEndDate", date);
  } else if (mode === "month" && month) {
    params.set("dailyStartDate", `${month}-01`);
    params.set("dailyEndDate", lastDateForPeriod("month", `${month}-01`));
  } else if (mode === "year" && year) {
    params.set("dailyStartDate", `${year}-01-01`);
    params.set("dailyEndDate", `${year}-12-31`);
  } else if (mode !== "all") {
    if (startDate) params.set("dailyStartDate", startDate);
    if (endDate) params.set("dailyEndDate", endDate);
  }

  if (filter.categoryId) params.set("dailyCategoryId", filter.categoryId);

  return parseDailyReportFilter(params);
}

function lastDateForPeriod(mode: "month", startDate: string) {
  const [year, month] = startDate.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
