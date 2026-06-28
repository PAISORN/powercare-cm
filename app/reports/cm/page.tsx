import { AppShell } from "../../../components/app-shell";
import { getActiveCategories, getActiveClaimants, getActiveZones } from "../../../lib/query-cache";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { parseReportFilter } from "../../../modules/reports/report-filter";
import { queryReportPreview } from "../../../modules/reports/report-query";
import { CmReportSection, ReportAccessDenied } from "../report-page-parts";

type CmReportSearchParams = Record<string, string | undefined>;

export default async function CmReportPage({ searchParams }: { searchParams: Promise<CmReportSearchParams> }) {
  const user = await requireUser();
  const canExport = user.role === RoleName.ADMIN || user.role === RoleName.ENGINEER;

  if (!canExport) return <ReportAccessDenied />;

  const rawParams = await searchParams;
  const filter = parseReportFilter(toUrlSearchParams(rawParams));
  const [{ rows, total }, categories, zones, claimants] = await Promise.all([
    queryReportPreview(filter, 50),
    getActiveCategories(),
    getActiveZones(),
    getActiveClaimants(),
  ]);

  return (
    <AppShell>
      <CmReportSection categories={categories} claimants={claimants} filter={filter} rows={rows} total={total} zones={zones} />
    </AppShell>
  );
}

function toUrlSearchParams(values: CmReportSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params;
}
