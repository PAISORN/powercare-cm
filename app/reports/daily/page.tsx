import { AppShell } from "../../../components/app-shell";
import { getActiveCategories } from "../../../lib/query-cache";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { parseDailyReportFilter, queryDailyReport } from "../../../modules/reports/daily-report";
import { DailyReportSection, ReportAccessDenied } from "../report-page-parts";

type DailyReportSearchParams = Record<string, string | undefined>;

export default async function DailyReportPage({ searchParams }: { searchParams: Promise<DailyReportSearchParams> }) {
  const user = await requireUser();
  const canExport = user.role === RoleName.ADMIN || user.role === RoleName.ENGINEER;

  if (!canExport) return <ReportAccessDenied />;

  const rawParams = await searchParams;
  const filter = parseDailyReportFilter(toUrlSearchParams(rawParams));
  const [report, categories] = await Promise.all([queryDailyReport(filter), getActiveCategories()]);

  return (
    <AppShell>
      <DailyReportSection categories={categories} report={report} />
    </AppShell>
  );
}

function toUrlSearchParams(values: DailyReportSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params;
}
