import { NextResponse } from "next/server";
import { createCmWorkWorkbook } from "../../../lib/excel";
import { getCurrentUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { toReportExportRow } from "../../../modules/reports/report-export";
import { parseReportFilter, reportFilterSummary } from "../../../modules/reports/report-filter";
import { queryReportRows } from "../../../modules/reports/report-query";

export const preferredRegion = "home";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== RoleName.ADMIN && user.role !== RoleName.ENGINEER) return new NextResponse("Forbidden", { status: 403 });

  const filter = parseReportFilter(new URL(request.url).searchParams);
  const works = await queryReportRows(filter);
  const workbook = createCmWorkWorkbook(works.map(toReportExportRow));

  await recordAudit({
    actorId: user.id,
    entityType: "REPORT",
    entityId: "cm-report",
    action: "EXPORT_REPORT",
    after: { format: "XLSX", rowCount: works.length, filter: reportFilterSummary(filter) },
  });

  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="powercare-cm-report.xlsx"',
    },
  });
}
