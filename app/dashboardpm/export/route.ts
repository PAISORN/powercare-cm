import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { canViewPm } from "../../../modules/auth/permission";
import { createPmWorkCsv } from "../../../modules/pm/pm-csv";
import { parsePmWorkFilter, pmWorkFilterSummary } from "../../../modules/pm/pm-filter";
import { resolvePmPageScope } from "../../../modules/pm/pm-page-scope";
import { PM_CSV_EXPORT_MAX_ROWS, queryPmWorkExport } from "../../../modules/pm/pm-query";

export const preferredRegion = "home";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!canViewPm(user)) return new NextResponse("Forbidden", { status: 403 });
  const params = new URL(request.url).searchParams;
  const scope = await resolvePmPageScope(user, { organizationId: params.get("organizationId") ?? undefined, plantId: params.get("plantId") ?? undefined });
  const serviceScope = { organizationId: scope.organization.id, plantId: scope.plant.id };
  const filter = parsePmWorkFilter(params);
  const exportResult = await queryPmWorkExport(filter, serviceScope);
  if (exportResult.exceeded) return new NextResponse(`Export exceeds the ${PM_CSV_EXPORT_MAX_ROWS.toLocaleString("en-US")} row limit. Narrow the filters and try again.`, { status: 413 });
  const rows = exportResult.rows;
  const csv = createPmWorkCsv(rows);
  await recordAudit({
    actorId: user.id, organizationId: serviceScope.organizationId, plantId: serviceScope.plantId,
    entityType: "REPORT", entityId: `pm-work:${serviceScope.plantId}`, action: "EXPORT_PM_WORK_CSV",
    after: { format: "CSV", rowCount: rows.length, filter: pmWorkFilterSummary(filter) },
  });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="powercare-pm-work.csv"' } });
}
