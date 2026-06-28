import Link from "next/link";
import { redirect } from "next/navigation";
import { PrintButton } from "../../../components/print-button";
import { formatThaiDateTime } from "../../../lib/date-time/bangkok-time";
import { AppBrand } from "../../../components/app-brand";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { RoleName, statusLabels, urgencyLabels, type Urgency, type WorkStatus } from "../../../modules/cm-work/cm-work-types";
import { parseReportFilter, reportFilterSummary } from "../../../modules/reports/report-filter";
import { queryReportRows } from "../../../modules/reports/report-query";

type PrintSearchParams = Record<string, string | undefined>;

export default async function PrintableReportPage({ searchParams }: { searchParams: Promise<PrintSearchParams> }) {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN && user.role !== RoleName.ENGINEER) redirect("/reports/cm");

  const values = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  const filter = parseReportFilter(params);
  const works = await queryReportRows(filter);

  await recordAudit({
    actorId: user.id,
    entityType: "REPORT",
    entityId: "cm-report",
    action: "EXPORT_REPORT",
    after: { format: "PRINT_PDF", rowCount: works.length, filter: reportFilterSummary(filter) },
  });

  return (
    <main className="min-h-screen bg-white p-5 text-black sm:p-8 print:p-0">
      <style>{"@page { size: A4 landscape; margin: 10mm; }"}</style>
      <header className="flex flex-col gap-4 border-b-2 border-slate-900 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-700"><AppBrand /></p>
          <h1 className="mt-1 text-2xl font-extrabold">Corrective Maintenance Report</h1>
          <p className="mt-1 text-sm text-slate-600">บริษัท รุ่งทิวา ไบโอแมส จำกัด</p>
          <p className="mt-1 text-xs text-slate-500">Generated: {formatThaiDateTime(new Date())} · {works.length.toLocaleString("en-US")} records</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2.5 font-semibold" href="/reports/cm">Back</Link>
          <PrintButton />
        </div>
      </header>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-left">
              {[
                "CM Number",
                "Created / Closed",
                "Machine / Problem",
                "Category / Zone",
                "Status / Urgency",
                "Requester / Department",
                "Claimant / Reviewer",
              ].map((heading) => <th className="border border-slate-300 px-2 py-2" key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {works.map((work) => (
              <tr className="break-inside-avoid" key={work.id}>
                <td className="border border-slate-300 px-2 py-2 align-top font-bold">{work.number}</td>
                <td className="border border-slate-300 px-2 py-2 align-top">
                  <p>{formatThaiDateTime(work.createdAt)}</p>
                  <p>{work.closedAt ? formatThaiDateTime(work.closedAt) : "-"}</p>
                </td>
                <td className="border border-slate-300 px-2 py-2 align-top">
                  <strong>{work.machineName}</strong>
                  <p>{work.problemTitle}</p>
                </td>
                <td className="border border-slate-300 px-2 py-2 align-top">
                  <p>{work.category.name}</p>
                  <p>{work.zone.name}</p>
                </td>
                <td className="border border-slate-300 px-2 py-2 align-top">
                  <p>{statusLabels[work.status as WorkStatus] ?? work.status}</p>
                  <p>{urgencyLabels[work.urgency as Urgency] ?? work.urgency}</p>
                </td>
                <td className="border border-slate-300 px-2 py-2 align-top">
                  <p>{work.requesterName}</p>
                  <p>{work.requesterDepartment}</p>
                </td>
                <td className="border border-slate-300 px-2 py-2 align-top">
                  <p>{work.claimant?.fullName ?? "-"}</p>
                  <p>{work.reviewer?.fullName ?? "-"}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
