import { Activity, AlertTriangle, BarChart3, CheckCircle2, CircleDot, ClipboardList, Factory, Flame, Search, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { DashboardFilterBar } from "../components/dashboard-filter-bar";
import { PublicHeader } from "../components/public-header";
import { PublicAnnouncements } from "../components/public-announcements";
import { StatusBadge } from "../components/status-badge";
import { formatThaiDateTime } from "../lib/date-time/bangkok-time";
import { WorkStatus, statusLabels } from "../modules/cm-work/cm-work-types";
import type { ChartRow, MonthlyTrendRow } from "../modules/dashboard/dashboard-chart-data";
import { toChartRows } from "../modules/dashboard/dashboard-chart-data";
import { getDashboardSummaryForDateFilter, type DashboardCategoryFilter } from "../modules/dashboard/dashboard-query";
import { hasExplicitCmDateFilter, parseCmDateFilter, type CmDateFilterInput } from "../modules/filters/cm-date-filter";
import { listPublicAnnouncements } from "../modules/announcements/announcement-service";
import { formatOrganizationDashboardTitle } from "../modules/organization/organization-profile";
import { readOrganizationProfile } from "../modules/organization/organization-service";

const statusColors: Record<WorkStatus, string> = {
  [WorkStatus.NEW]: "#3b82f6",
  [WorkStatus.WAITING_TO_CLAIM]: "#f59e0b",
  [WorkStatus.CLAIMED]: "#14b8a6",
  [WorkStatus.IN_PROGRESS]: "#8b5cf6",
  [WorkStatus.WAITING_TO_CLOSE]: "#ef4444",
  [WorkStatus.RETURNED_FOR_CORRECTION]: "#fb7185",
  [WorkStatus.CLOSED]: "#22c55e",
  [WorkStatus.CANCELED]: "#64748b",
};

const zoneColors = ["#ef4444", "#f59e0b", "#3b82f6", "#14b8a6", "#8b5cf6", "#06b6d4"];
const inProcessStatuses = [
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
];

type LandingSearchParams = {
  category?: string;
  mode?: "day" | "range" | "month" | "year" | "all";
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  includeTerminal?: string;
};

export default async function LandingPage({ searchParams }: { searchParams: Promise<LandingSearchParams> }) {
  const params = await searchParams;
  const activeCategoryFilter = normalizeDashboardCategory(params.category);
  const activeDateFilterInput = readDateFilterInput(params);
  const hasExplicitDateFilter = hasExplicitCmDateFilter(activeDateFilterInput);
  const activeDateFilter = hasExplicitDateFilter ? safeParseDateFilter(activeDateFilterInput) : undefined;
  const [summary, announcements, organization] = await Promise.all([
    getDashboardSummaryForDateFilter({ category: activeCategoryFilter, dateFilter: activeDateFilter }),
    listPublicAnnouncements(),
    readOrganizationProfile(),
  ]);
  const statusCountByKey = new Map<WorkStatus, number>(summary.byStatus.map((item) => [item.status as WorkStatus, item.count]));
  const statusRows = Object.values(WorkStatus).map((status) => ({
    label: statusLabels[status],
    value: statusCountByKey.get(status) ?? 0,
    color: statusColors[status],
  }));
  const statusTotal = statusRows.reduce((sum, row) => sum + row.value, 0);
  const newCount = statusCountByKey.get(WorkStatus.NEW) ?? 0;
  const closedCount = statusCountByKey.get(WorkStatus.CLOSED) ?? 0;
  const canceledCount = statusCountByKey.get(WorkStatus.CANCELED) ?? 0;
  const inProcessCount = inProcessStatuses.reduce((sum, status) => sum + (statusCountByKey.get(status) ?? 0), 0);
  const zoneRows = toChartRows(summary.byZone.map((item) => ({ label: item.zoneName, count: item.count }))).sort((a, b) => b.count - a.count);

  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-[1480px] px-5 py-5 md:px-7">
        <section className="cm-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
          <div className="plant-skyline" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                <Factory size={17} />
                CM Operations Dashboard
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-normal">{formatOrganizationDashboardTitle(organization.companyName)}</h1>
              <p className="mt-2 max-w-2xl text-white/80">Operation Command Center สำหรับดูสถานะ งานเร่งด่วน โซน และแนวโน้มรายเดือนในหน้าเดียว</p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/90">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={17} /> Role based control
                </span>
                <span className="inline-flex items-center gap-2">
                  <Activity size={17} /> Live work overview
                </span>
                <span className="inline-flex items-center gap-2">
                  <Factory size={17} /> 10 plant zones
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-right text-sm backdrop-blur">
              <p className="font-semibold">อัปเดตล่าสุด</p>
              <p className="text-white/80">{formatThaiDateTime(new Date())}</p>
            </div>
          </div>
        </section>

        <section className="relative z-20 mx-auto -mt-7 max-w-4xl rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
          <div className="grid gap-3 md:grid-cols-2">
            <Link className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3.5 transition hover:bg-[var(--surface)]" href="/request">
              <p className="text-sm text-[var(--muted)]">Create Request</p>
              <strong className="mt-1 flex items-center gap-2 text-lg">
                <Wrench size={18} className="text-[var(--primary)]" />
                แจ้งซ่อมทันที
              </strong>
            </Link>
            <Link className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3.5 transition hover:bg-[var(--surface)]" href="/tracking">
              <p className="text-sm text-[var(--muted)]">Track CM Number</p>
              <strong className="mt-1 flex items-center gap-2 text-lg">
                <Search size={18} className="text-[var(--primary)]" />
                ติดตามสถานะงาน
              </strong>
            </Link>
          </div>
        </section>

        <PublicAnnouncements
          announcements={announcements.map((announcement) => ({
            id: announcement.id,
            title: announcement.title,
            content: announcement.content,
            publishStart: announcement.publishStart,
            publishEnd: announcement.publishEnd,
            pinned: announcement.pinned,
            isNew: announcement.isNew,
            imageStoragePath: announcement.imageStoragePath,
            authorName: announcement.author.fullName,
          }))}
        />

        <DashboardFilterBar activeCategory={activeCategoryFilter} activeDateFilter={hasExplicitDateFilter ? activeDateFilterInput : undefined} clearHref="/" />

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total CM" value={String(summary.total)} note="งานซ่อมทั้งหมด" icon={<ClipboardList size={34} />} color="#3b82f6" />
          <KpiCard label="New Request" value={String(newCount)} note="แจ้งซ่อมใหม่" icon={<CircleDot size={34} />} color="#06b6d4" />
          <KpiCard label="In Process" value={String(inProcessCount)} note="งานอยู่ระหว่างดำเนินการ" icon={<Wrench size={34} />} color="#14b8a6" />
          <KpiCard label="Closed" value={String(closedCount)} note="ปิดงานแล้ว" icon={<CheckCircle2 size={34} />} color="#22c55e" />
          <KpiCard label="Cancel" value={String(canceledCount)} note="ยกเลิก" icon={<AlertTriangle size={34} />} color="#8b5cf6" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel title="Status Overview" icon={<CircleDot size={22} className="text-[#3b82f6]" />} aside={hasExplicitDateFilter ? `${statusTotal} jobs` : "Current year"}>
            <div className="grid gap-4 lg:grid-cols-[minmax(360px,1fr)_230px] lg:items-center">
              <Donut rows={statusRows} total={statusTotal} centerLabel="Total CM" />
              <Legend rows={statusRows} total={statusTotal} />
            </div>
          </Panel>

          <Panel title="Monthly CM Trend" icon={<BarChart3 size={22} className="text-[#14b8a6]" />} aside={hasExplicitDateFilter ? `${summary.monthlyTrend.length}-month view` : "Latest 6 months"}>
            <MonthlyTrendPanel rows={summary.monthlyTrend} />
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Plant Zone Workload" icon={<Factory size={22} className="text-[#f59e0b]" />} aside={hasExplicitDateFilter ? "All zones" : "Current year"}>
            <div className="mt-4 grid gap-4">
              {zoneRows.map((row, index) => (
                <ZoneBar key={row.label} row={row} color={zoneColors[index % zoneColors.length]} />
              ))}
            </div>
          </Panel>

          <Panel title="Priority Work Queue" icon={<Flame size={22} className="text-[#ef4444]" />} aside={hasExplicitDateFilter ? "Read only" : "Top 5 priority"}>
            <div className="mt-4 grid gap-4">
              {summary.priorityWorks.length ? (
                summary.priorityWorks.map((work) => (
                  <div key={work.id} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 md:grid-cols-[1fr_auto]">
                    <span className="min-w-0">
                      <strong className="block text-lg">{work.number}</strong>
                      <span className="mt-1 block text-sm font-semibold text-[var(--ink)]">
                        Category: {work.category.name} · Zone: {work.zone.name}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--muted)]">
                        Date: {formatStatusDate(getStatusDate(work))} · Assignee: {work.claimant?.fullName ?? "-"} · Work: {work.problemTitle}
                      </span>
                    </span>
                    <span className="self-start">
                      <StatusBadge status={work.status} />
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)]">No urgent work waiting right now.</p>
              )}
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function KpiCard({ label, value, note, icon, color }: { label: string; value: string; note: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-[var(--shadow)]" style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 78%, white))` }} aria-label={`KPI ${label}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white/80">{label}</p>
          <strong className="mt-2 block text-4xl">{value}</strong>
        </div>
        <div className="text-white/75">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-white/80">{note}</p>
    </div>
  );
}

function Panel({ title, icon, aside, children }: { title: string; icon: React.ReactNode; aside: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-3 text-xl font-bold sm:text-2xl">
          {icon}
          {title}
        </h2>
        <span className="text-sm text-[var(--muted)]">{aside}</span>
      </div>
      {children}
    </section>
  );
}

function normalizeDashboardCategory(value?: string): DashboardCategoryFilter | undefined {
  return value === "mechanical" || value === "electrical" ? value : undefined;
}

function readDateFilterInput(params: LandingSearchParams): CmDateFilterInput {
  return {
    mode: params.mode,
    date: params.date,
    startDate: params.startDate,
    endDate: params.endDate,
    month: params.month,
    year: params.year,
    includeTerminal: params.includeTerminal,
  };
}

function safeParseDateFilter(input: CmDateFilterInput) {
  try {
    return parseCmDateFilter(input);
  } catch {
    return undefined;
  }
}

function Donut({ rows, total, centerLabel }: { rows: { label: string; value: number; color: string }[]; total: number; centerLabel: string }) {
  let current = 0;
  const parts = rows.map((row) => {
    const start = current;
    current += total === 0 ? 0 : (row.value / total) * 100;
    return `${row.color} ${start}% ${current}%`;
  });

  return (
    <div className="cm-donut-motion mx-auto mt-5 grid aspect-square w-full max-w-[340px] place-items-center rounded-full" style={{ background: `conic-gradient(${parts.join(", ") || "var(--line) 0 100%"})` }}>
      <div className="cm-donut-core grid h-[52%] w-[52%] place-items-center rounded-full bg-[var(--surface)] text-center shadow-sm">
        <span>
          <small className="block text-xs text-[var(--muted)]">{centerLabel}</small>
          <strong className="block text-4xl sm:text-5xl">{total}</strong>
        </span>
      </div>
    </div>
  );
}

function Legend({ rows, total }: { rows: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="mx-auto grid w-full max-w-[310px] gap-1.5 lg:mx-0 lg:max-w-[230px] lg:justify-self-end">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--soft)] px-2.5 py-1.5 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <i className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="truncate">{row.label}</span>
          </span>
          <strong className="shrink-0 text-sm font-bold tabular-nums">
            {row.value} - {total === 0 ? 0 : Math.round((row.value / total) * 100)}%
          </strong>
        </div>
      ))}
    </div>
  );
}

function MonthlyTrendPanel({ rows }: { rows: MonthlyTrendRow[] }) {
  const max = Math.max(1, ...rows.flatMap((row) => [getStatusCount(row, WorkStatus.NEW), getFollowUpStatusTotal(row)]));
  const legendStatuses = [
    WorkStatus.NEW,
    WorkStatus.WAITING_TO_CLAIM,
    WorkStatus.CLAIMED,
    WorkStatus.IN_PROGRESS,
    WorkStatus.WAITING_TO_CLOSE,
    WorkStatus.RETURNED_FOR_CORRECTION,
    WorkStatus.CLOSED,
    WorkStatus.CANCELED,
  ];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 text-[11px] text-[var(--muted)] sm:justify-end sm:gap-x-4 sm:text-xs">
        {legendStatuses.map((status) => (
          <LegendKey key={status} color={statusColors[status]} label={statusLabels[status]} />
        ))}
      </div>
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-[var(--soft)] px-2 pb-4 pt-6 sm:px-4">
        <div className="absolute inset-x-4 top-6 bottom-16 grid grid-rows-5" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="border-t border-[var(--line)]" />
          ))}
        </div>
        <div className="relative z-10 grid min-h-60 grid-cols-6 items-end gap-1 sm:min-h-72 sm:gap-3 lg:gap-4">
          {rows.map((row, index) => (
            <MonthlyBar key={row.key} row={row} max={max} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function MonthlyBar({ row, max, index }: { row: MonthlyTrendRow; max: number; index: number }) {
  const followUpStatuses = [
    WorkStatus.WAITING_TO_CLAIM,
    WorkStatus.CLAIMED,
    WorkStatus.IN_PROGRESS,
    WorkStatus.WAITING_TO_CLOSE,
    WorkStatus.RETURNED_FOR_CORRECTION,
    WorkStatus.CLOSED,
    WorkStatus.CANCELED,
  ];
  const newCount = getStatusCount(row, WorkStatus.NEW);
  const followUpTotal = getFollowUpStatusTotal(row);
  const maxHeight = 205;
  const newHeight = newCount === 0 ? 12 : Math.max(24, Math.round((newCount / max) * maxHeight));
  const followUpHeight = followUpTotal === 0 ? 12 : Math.max(24, Math.round((followUpTotal / max) * maxHeight));

  return (
    <div className="grid h-60 grid-rows-[1fr_auto_auto] items-end gap-2 text-center sm:h-72">
      <div className="mx-auto grid h-48 w-full max-w-[46px] grid-cols-[14px_14px] items-end justify-center gap-1 pb-0 sm:h-56 sm:max-w-[88px] sm:grid-cols-[22px_22px] sm:gap-3 lg:max-w-[96px] lg:grid-cols-[24px_24px] lg:gap-4">
        <span className="cm-monthly-bar flex w-3.5 overflow-hidden rounded-t-md bg-[var(--line)] sm:w-[22px] lg:w-6" style={{ height: `min(${newHeight}px, 100%)`, "--cm-delay": `${index * 90}ms` } as React.CSSProperties}>
          <i className="block h-full w-full" style={{ backgroundColor: statusColors[WorkStatus.NEW] }} />
        </span>
        <span className="cm-monthly-bar flex w-3.5 flex-col-reverse overflow-hidden rounded-t-md bg-[var(--line)] sm:w-[22px] lg:w-6" style={{ height: `min(${followUpHeight}px, 100%)`, "--cm-delay": `${index * 90 + 70}ms` } as React.CSSProperties}>
          {followUpStatuses.map((status) => {
            const count = getStatusCount(row, status);
            if (count === 0) return null;
            return <i key={status} className="block" style={{ flexGrow: count, backgroundColor: statusColors[status] }} />;
          })}
        </span>
      </div>
      <strong className="text-xs">
        {newCount} / {followUpTotal}
      </strong>
      <span className="truncate text-[10px] text-[var(--muted)] sm:text-xs">{row.label}</span>
    </div>
  );
}

function getStatusCount(row: MonthlyTrendRow, status: WorkStatus) {
  return row.statusCounts?.[status] ?? 0;
}

function getFollowUpStatusTotal(row: MonthlyTrendRow) {
  return (
    getStatusCount(row, WorkStatus.WAITING_TO_CLAIM) +
    getStatusCount(row, WorkStatus.CLAIMED) +
    getStatusCount(row, WorkStatus.IN_PROGRESS) +
    getStatusCount(row, WorkStatus.WAITING_TO_CLOSE) +
    getStatusCount(row, WorkStatus.RETURNED_FOR_CORRECTION) +
    getStatusCount(row, WorkStatus.CLOSED) +
    getStatusCount(row, WorkStatus.CANCELED)
  );
}

type StatusDateInput = {
  status: string;
  createdAt: Date;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  waitingToCloseAt: Date | null;
  closedAt: Date | null;
  canceledAt: Date | null;
  statusHistory: { changedAt: Date }[];
};

function getStatusDate(work: StatusDateInput) {
  switch (work.status) {
    case WorkStatus.NEW:
      return work.createdAt;
    case WorkStatus.CLAIMED:
      return work.claimedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.IN_PROGRESS:
      return work.inProgressAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.WAITING_TO_CLOSE:
      return work.waitingToCloseAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.CLOSED:
      return work.closedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.CANCELED:
      return work.canceledAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.WAITING_TO_CLAIM:
    case WorkStatus.RETURNED_FOR_CORRECTION:
    default:
      return work.statusHistory[0]?.changedAt ?? work.createdAt;
  }
}

function formatStatusDate(date: Date) {
  return formatThaiDateTime(date);
}

function ZoneBar({ row, color }: { row: ChartRow; color: string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">{row.label}</span>
        <strong>{row.count}</strong>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-[var(--soft)]">
        <div className="cm-zone-fill h-full rounded-full" style={{ width: `${row.percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
