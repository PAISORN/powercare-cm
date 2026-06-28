import { CalendarDays, Download, FileSpreadsheet, Printer } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { CmDateFilterBar } from "../../components/cm-date-filter-bar";
import { CopyDailyReportButton } from "../../components/copy-daily-report-button";
import { ReportFilterForm } from "../../components/report-filter-form";
import { StatusBadge } from "../../components/status-badge";
import { UserAvatar } from "../../components/user-avatar";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { urgencyLabels, type Urgency } from "../../modules/cm-work/cm-work-types";
import type { DailyReport } from "../../modules/reports/daily-report";
import { serializeReportFilter, type ReportFilter } from "../../modules/reports/report-filter";
import type { ReportWorkRow } from "../../modules/reports/report-query";

type Option = { id: string; name: string };
type ClaimantOption = { id: string; fullName: string };

export function ReportAccessDenied() {
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

export function DailyReportSection({ categories, report }: { categories: Option[]; report: DailyReport }) {
  const copyText = buildDailyReportCopyText(report);

  return (
    <section className="mb-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-4 py-5 shadow-[var(--shadow)] sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
            <CalendarDays aria-hidden="true" size={17} />
            Daily Report
          </p>
          <h2 className="mt-3 text-2xl font-extrabold">รายงานตามช่วงวันที่</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">ดูจำนวนงานแจ้งใหม่และงานปิดตามช่วงวันที่และ Category เพื่อคัดลอกไปทำรายงานได้ทันที</p>
        </div>
      </div>

      <form action="/reports/daily" className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(220px,0.7fr)_auto_auto] lg:items-end" method="get">
        <CmDateFilterBar
          defaultEndDate={report.endDate}
          defaultMode="range"
          defaultStartDate={report.startDate}
          fieldNames={{ mode: "dailyMode", startDate: "dailyStartDate", endDate: "dailyEndDate" }}
        />
        <label className="grid gap-1 text-sm font-semibold">
          <span className="text-[var(--muted)]">Category</span>
          <select
            aria-label="Daily report category"
            className="min-h-[52px] rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none"
            defaultValue={report.categoryId ?? ""}
            name="dailyCategoryId"
          >
            <option value="">All Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-[52px] rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]" type="submit">
          ดูรายงาน
        </button>
        <Link className="flex min-h-[52px] items-center justify-center rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-semibold hover:bg-[var(--soft)]" href="/reports/daily">
          Clear filters
        </Link>
      </form>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <DailyMetricCard label="แจ้งใหม่" note="งานที่ถูกสร้างในช่วงวันที่เลือก" value={report.newCount} />
        <DailyMetricCard label="ปิดงาน" note="งานที่ปิดสำเร็จในช่วงวันที่เลือก" value={report.closedCount} />
      </div>

      <div className="mt-5 flex justify-end">
        <CopyDailyReportButton text={copyText} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <DailyWorkList emptyText="ไม่มีรายการแจ้งใหม่ในช่วงวันที่เลือก" rows={report.newWorks} title="รายการแจ้งใหม่" timeField="createdAt" />
        <DailyWorkList emptyText="ไม่มีรายการปิดงานในช่วงวันที่เลือก" rows={report.closedWorks} title="รายการปิดงาน" timeField="closedAt" />
      </div>
    </section>
  );
}

function DailyMetricCard({ label, note, value }: { label: string; note: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <strong className="mt-2 block text-4xl font-extrabold">{value.toLocaleString("en-US")}</strong>
      <p className="mt-2 text-sm text-[var(--muted)]">{note}</p>
    </div>
  );
}

function DailyWorkList({
  emptyText,
  rows,
  timeField,
  title,
}: {
  emptyText: string;
  rows: DailyReport["newWorks"];
  timeField: "createdAt" | "closedAt";
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-extrabold">{title}</h3>
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--muted)]">{rows.length} รายการ</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--muted)]">{emptyText}</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.map((work) => {
            const dateValue = timeField === "closedAt" ? work.closedAt : work.createdAt;
            return (
              <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4" key={`${title}-${work.id}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <strong className="block">{work.number}</strong>
                    <p className="mt-1 text-sm font-semibold">{work.problemTitle}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{work.machineName}</p>
                  </div>
                  <StatusBadge status={work.status} />
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {work.category.name} · {work.zone.name}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {dateValue ? formatThaiDateTime(dateValue) : "-"}
                  {work.claimant ? ` · ${work.claimant.fullName}` : ""}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildDailyReportCopyText(report: DailyReport) {
  const lines = [
    `PowerCare.CM Report (${report.startDate} - ${report.endDate})`,
    `แจ้งใหม่: ${report.newCount} งาน`,
    `ปิดงาน: ${report.closedCount} งาน`,
    "",
    "รายการแจ้งใหม่",
    ...formatDailyCopyRows(report.newWorks, "createdAt"),
    "",
    "รายการปิดงาน",
    ...formatDailyCopyRows(report.closedWorks, "closedAt"),
  ];

  return lines.join("\n");
}

function formatDailyCopyRows(rows: DailyReport["newWorks"], timeField: "createdAt" | "closedAt") {
  if (rows.length === 0) return ["- ไม่มีรายการ"];

  return rows.map((work, index) => {
    const dateValue = timeField === "closedAt" ? work.closedAt : work.createdAt;
    return `${index + 1}. ${work.number} | ${work.problemTitle} | ${work.machineName} | ${work.category.name} | ${work.zone.name} | ${dateValue ? formatThaiDateTime(dateValue) : "-"}`;
  });
}

export function CmReportSection({
  categories,
  claimants,
  filter,
  rows,
  total,
  zones,
}: {
  categories: Option[];
  claimants: ClaimantOption[];
  filter: ReportFilter;
  rows: ReportWorkRow[];
  total: number;
  zones: Option[];
}) {
  const query = serializeReportFilter(filter);

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-5 py-7 text-white sm:px-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">
          <FileSpreadsheet aria-hidden="true" size={17} />
          CM Reports
        </p>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">รายงาน Corrective Maintenance</h1>
        <p className="mt-2 text-sm text-white/85">กรอง ตรวจสอบ และส่งออกข้อมูลงานซ่อมตามเงื่อนไขที่เลือก</p>
      </div>

      <ReportFilterForm
        action="/reports/cm"
        categories={categories}
        claimants={claimants.map((claimant) => ({ id: claimant.id, name: claimant.fullName }))}
        clearHref="/reports/cm"
        filter={filter}
        zones={zones}
      />

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

