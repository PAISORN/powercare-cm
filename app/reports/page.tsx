import { Download, FileSpreadsheet, Printer } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ReportFilterForm } from "../../components/report-filter-form";
import { StatusBadge } from "../../components/status-badge";
import { UserAvatar } from "../../components/user-avatar";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { getActiveCategories, getActiveClaimants, getActiveZones } from "../../lib/query-cache";
import { requireUser } from "../../lib/session";
import { RoleName, urgencyLabels, type Urgency } from "../../modules/cm-work/cm-work-types";
import { parseReportFilter, serializeReportFilter } from "../../modules/reports/report-filter";
import { queryReportPreview, type ReportWorkRow } from "../../modules/reports/report-query";

type ReportSearchParams = Record<string, string | undefined>;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  const user = await requireUser();
  const canExport = user.role === RoleName.ADMIN || user.role === RoleName.ENGINEER;

  if (!canExport) {
    return (
      <AppShell>
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow)]">
          <FileSpreadsheet className="mx-auto text-[var(--primary)]" size={42} />
          <h1 className="mt-4 text-2xl font-extrabold">Reports</h1>
          <p className="mt-2 text-[var(--muted)]">บัญชีนี้ไม่มีสิทธิ์ดูหรือส่งออกรายงานภาพรวม</p>
        </section>
      </AppShell>
    );
  }

  const rawParams = await searchParams;
  const urlParams = toUrlSearchParams(rawParams);
  const filter = parseReportFilter(urlParams);
  const [{ rows, total }, categories, zones, claimants] = await Promise.all([
    queryReportPreview(filter, 50),
    getActiveCategories(),
    getActiveZones(),
    getActiveClaimants(),
  ]);
  const query = serializeReportFilter(filter);

  return (
    <AppShell>
      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-5 py-7 text-white sm:px-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">
            <FileSpreadsheet aria-hidden="true" size={17} />
            CM Reports
          </p>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">รายงาน Corrective Maintenance</h1>
          <p className="mt-2 text-sm text-white/85">กรอง ตรวจสอบ และส่งออกข้อมูลจากเงื่อนไขเดียวกัน</p>
        </div>

        <ReportFilterForm categories={categories} claimants={claimants.map((claimant) => ({ id: claimant.id, name: claimant.fullName }))} filter={filter} zones={zones} />

        <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm text-[var(--muted)]">Matching results</p>
            <p className="text-xl font-extrabold">{total.toLocaleString("en-US")} รายการ</p>
            <p className="text-xs text-[var(--muted)]">Preview แสดงสูงสุด 50 รายการ ส่วนไฟล์ส่งออกแสดงครบทุกผลลัพธ์</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700" href={`/reports/export?${query}`}>
              <Download aria-hidden="true" size={17} />
              Excel
            </a>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold hover:bg-[var(--soft)]" href={`/reports/print?${query}`} target="_blank">
              <Printer aria-hidden="true" size={17} />
              Print / PDF
            </Link>
          </div>
        </div>

        <ReportPreview rows={rows} />
      </section>
    </AppShell>
  );
}

function ReportPreview({ rows }: { rows: ReportWorkRow[] }) {
  if (rows.length === 0) {
    return <p className="p-10 text-center text-[var(--muted)]">ไม่พบงานที่ตรงกับตัวกรอง</p>;
  }

  return (
    <>
      <div className="grid gap-3 p-4 md:hidden">
        {rows.map((work) => (
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4" key={work.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block truncate">{work.number}</strong>
                <p className="mt-1 text-xs text-[var(--muted)]">{formatThaiDateTime(work.createdAt)}</p>
              </div>
              <StatusBadge status={work.status} />
            </div>
            <p className="mt-3 font-semibold">{work.machineName}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{work.problemTitle}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3 text-sm">
              <Detail label="Category / Zone" value={`${work.category.name} / ${work.zone.name}`} />
              <Detail label="Urgency" value={urgencyLabels[work.urgency as Urgency] ?? work.urgency} />
              <Detail label="Requester" value={work.requesterName} />
              <Detail label="Claimant" value={work.claimant?.fullName ?? "-"} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-[var(--soft)] text-[var(--muted)]">
            <tr>
              {[
                "CM Number / Date",
                "Machine / Problem",
                "Category / Zone",
                "Status / Urgency",
                "Requester / Department",
                "Claimant",
              ].map((heading) => (
                <th className="px-4 py-3 font-bold" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((work) => (
              <tr className="hover:bg-[var(--soft)]" key={work.id}>
                <td className="px-4 py-3 align-top">
                  <strong>{work.number}</strong>
                  <p className="mt-1 text-xs text-[var(--muted)]">{formatThaiDateTime(work.createdAt)}</p>
                </td>
                <td className="max-w-[300px] px-4 py-3 align-top">
                  <strong className="block truncate">{work.machineName}</strong>
                  <p className="mt-1 truncate text-[var(--muted)]">{work.problemTitle}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <strong>{work.category.name}</strong>
                  <p className="mt-1 text-[var(--muted)]">{work.zone.name}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={work.status} />
                  <p className="mt-2 text-[var(--muted)]">{urgencyLabels[work.urgency as Urgency] ?? work.urgency}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <strong>{work.requesterName}</strong>
                  <p className="mt-1 text-[var(--muted)]">{work.requesterDepartment}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  {work.claimant ? (
                    <span className="flex items-center gap-2">
                      <UserAvatar fullName={work.claimant.fullName} size="sm" />
                      <span className="font-semibold">{work.claimant.fullName}</span>
                    </span>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function toUrlSearchParams(values: ReportSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params;
}
