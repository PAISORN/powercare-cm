import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, CircleDot, ClipboardList, Factory, Flame, Gauge, Wrench } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { DashboardFilterBar } from "../../components/dashboard-filter-bar";
import { OrganizationHeroLogo } from "../../components/organization-hero-logo";
import { StatusBadge } from "../../components/status-badge";
import { UserAvatar } from "../../components/user-avatar";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { WorkStatus, statusLabels } from "../../modules/cm-work/cm-work-types";
import type { ChartRow, MonthlyTrendRow } from "../../modules/dashboard/dashboard-chart-data";
import { toChartRows } from "../../modules/dashboard/dashboard-chart-data";
import { getDashboardSummaryForDateFilter, type DashboardCategoryFilter } from "../../modules/dashboard/dashboard-query";
import { hasExplicitCmDateFilter, parseCmDateFilter, type CmDateFilterInput } from "../../modules/filters/cm-date-filter";
import { requireUser } from "../../lib/session";
import { getUnreadSummary, markStatusGroupRead } from "../../modules/notifications/notification-service";
import type { NotificationGroup } from "../../modules/notifications/notification-types";
import { UnreadBadge } from "../../components/unread-badge";
import { formatOrganizationDashboardTitle } from "../../modules/organization/organization-profile";
import { readOrganizationProfile } from "../../modules/organization/organization-service";
import { readPlantProfile } from "../../modules/organization/plant-profile-service";
import { buildUserOperationalScope } from "../../modules/organization/user-plant-scope";

const statusColors: Record<WorkStatus, string> = {
  [WorkStatus.NEW]: "#3b82f6",
  [WorkStatus.WAITING_TO_CLAIM]: "#f59e0b",
  [WorkStatus.CLAIMED]: "#14b8a6",
  [WorkStatus.IN_PROGRESS]: "#8b5cf6",
  [WorkStatus.BACKLOG_SHUTDOWN]: "#78716c",
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
  WorkStatus.BACKLOG_SHUTDOWN,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
];

type DashboardSearchParams = {
  category?: string;
  mode?: "day" | "range" | "month" | "year" | "all";
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  includeTerminal?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const activeCategoryFilter = normalizeDashboardCategory(params.category);
  const activeDateFilterInput = readDateFilterInput(params);
  const hasExplicitDateFilter = hasExplicitCmDateFilter(activeDateFilterInput);
  const activeDateFilter = hasExplicitDateFilter ? safeParseDateFilter(activeDateFilterInput) : undefined;
  const scope = buildUserOperationalScope(user);
  const [summary, unreadSummary, dashboardProfile] = await Promise.all([
    getDashboardSummaryForDateFilter({ category: activeCategoryFilter, dateFilter: activeDateFilter, defaultTrendMonthCount: 12, scope }),
    getUnreadSummary(user.id, scope),
    scope.plantId ? readPlantProfile(scope.plantId) : readOrganizationProfile(scope.organizationId),
  ]);
  const dashboardCompanyName = "displayName" in dashboardProfile ? dashboardProfile.displayName : dashboardProfile.companyName;
  const dashboardLogoSrc = "plantId" in dashboardProfile
    ? `/organization-logo?plantId=${encodeURIComponent(dashboardProfile.plantId)}`
    : `/organization-logo?organizationId=${encodeURIComponent(dashboardProfile.organizationId ?? "")}`;

  async function markDashboardGroupReadAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const group = String(formData.get("group") ?? "") as NotificationGroup;
    const href = String(formData.get("href") ?? "/work");
    const scope = buildUserOperationalScope(currentUser);
    const allowedGroups = ["ALL_CM", "NEW", "IN_PROCESS", "CLOSED", "CANCELED"];
    if (allowedGroups.includes(group)) await markStatusGroupRead(currentUser.id, group, scope);
    redirect(href.startsWith("/work") ? href : "/work");
  }
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
  const waitingCloseCount = statusCountByKey.get(WorkStatus.WAITING_TO_CLOSE) ?? 0;
  const categoryTotal = summary.byCategory.reduce((sum, row) => sum + row.count, 0);
  const topCategory = [...summary.byCategory].sort((a, b) => b.count - a.count)[0];
  const topCategoryPercent = topCategory && categoryTotal > 0 ? Math.round((topCategory.count / categoryTotal) * 100) : 0;
  const zoneRows = toChartRows(summary.byZone.map((item) => ({ label: item.zoneName, count: item.count }))).sort((a, b) => b.count - a.count);
  const workCategoryParam = summary.activeCategory ? `categoryId=${encodeURIComponent(summary.activeCategory.id)}` : "";

  return (
    <AppShell>
      <section className="cm-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
        <div className="plant-skyline" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              <Factory size={17} />
              CM Operations Dashboard
            </p>
            <h1 className="mt-5 max-w-5xl text-3xl font-extrabold tracking-normal sm:text-4xl">{formatOrganizationDashboardTitle(dashboardCompanyName)}</h1>
            <p className="mt-2 max-w-2xl text-white/80">Operation Command Center สำหรับดูสถานะ งานเร่งด่วน โซน และแนวโน้มรายเดือนในหน้าเดียว</p>
          </div>
          <OrganizationHeroLogo companyName={dashboardCompanyName} hasLogo={dashboardProfile.hasLogo} logoSrc={dashboardLogoSrc} />
        </div>
      </section>

      <DashboardFilterBar activeCategory={activeCategoryFilter} activeDateFilter={hasExplicitDateFilter ? activeDateFilterInput : undefined} clearHref="/dashboard" />

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard href={buildWorkHref(workCategoryParam)} group="ALL_CM" unreadCount={unreadSummary.total} readAction={markDashboardGroupReadAction} label="Total CM" value={String(summary.total)} note="งานซ่อมทั้งหมด" icon={<ClipboardList size={34} />} color="#3b82f6" />
        <KpiCard href={buildWorkHref(workCategoryParam, { status: WorkStatus.NEW })} group="NEW" unreadCount={unreadSummary.newRequest} readAction={markDashboardGroupReadAction} label="New Request" value={String(newCount)} note="แจ้งซ่อมใหม่" icon={<CircleDot size={34} />} color="#06b6d4" />
        <KpiCard href={buildWorkHref(workCategoryParam, { statusGroup: "IN_PROCESS" })} group="IN_PROCESS" unreadCount={unreadSummary.inProcess} readAction={markDashboardGroupReadAction} label="In Process" value={String(inProcessCount)} note="งานอยู่ระหว่างดำเนินการ" icon={<Wrench size={34} />} color="#14b8a6" />
        <KpiCard href={buildWorkHref(workCategoryParam, { status: WorkStatus.CLOSED })} group="CLOSED" unreadCount={unreadSummary.closed} readAction={markDashboardGroupReadAction} label="Closed" value={String(closedCount)} note="ปิดงานแล้ว" icon={<CheckCircle2 size={34} />} color="#22c55e" />
        <KpiCard href={buildWorkHref(workCategoryParam, { status: WorkStatus.CANCELED })} group="CANCELED" unreadCount={unreadSummary.canceled} readAction={markDashboardGroupReadAction} label="Cancel" value={String(canceledCount)} note="ยกเลิก" icon={<AlertTriangle size={34} />} color="#8b5cf6" />
      </section>

      <section className="mt-6">
        <Panel title="Monthly CM Trend" icon={<BarChart3 size={22} className="text-[#14b8a6]" />} aside={hasExplicitDateFilter ? `${summary.monthlyTrend.length}-month view` : "Latest 12 months"}>
          <MonthlyTrendPanel rows={summary.monthlyTrend} />
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Status Overview" icon={<CircleDot size={22} className="text-[#3b82f6]" />} aside={hasExplicitDateFilter ? `${statusTotal} jobs` : "Current year"}>
          <StatusOverviewContent rows={statusRows} total={statusTotal} />
        </Panel>

        <Panel title="Report เมื่อวาน" icon={<CalendarDays size={22} className="text-[#14b8a6]" />} aside={formatDashboardIsoDate(summary.yesterdayReport.date)}>
          <YesterdayCategoryReport report={summary.yesterdayReport} />
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Plant Zone Workload" icon={<Factory size={22} className="text-[#f59e0b]" />} aside={hasExplicitDateFilter ? "Top zones" : "Current year"}>
          <div className="mt-4 grid gap-4">
            {zoneRows.map((row, index) => (
              <ZoneBar key={`${row.label}-${index}`} row={row} color={zoneColors[index % zoneColors.length]} />
            ))}
          </div>
        </Panel>

        <Panel title="Priority Work Queue" icon={<Flame size={22} className="text-[#ef4444]" />} aside={hasExplicitDateFilter ? "Action first" : "Top 5 priority"}>
          <div className="mt-4 grid gap-4">
            {summary.priorityWorks.length ? (
              summary.priorityWorks.map((work) => (
                <Link key={work.id} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 hover:bg-[var(--surface)] md:grid-cols-[1fr_auto]" href={`/work/${work.id}`}>
                  <span className="min-w-0">
                    <strong className="block text-lg">{work.number}</strong>
                    <span className="mt-1 block text-sm font-semibold text-[var(--ink)]">
                      Category: {work.category.name} · Zone: {work.zone.name}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                      {work.claimant ? <UserAvatar fullName={work.claimant.fullName} hasPhoto={Boolean(work.claimant.profilePhoto)} size="sm" userId={work.claimant.id} version={work.claimant.profilePhoto?.updatedAt.getTime()} /> : null}
                      <span>
                        Date: {formatStatusDate(getStatusDate(work))} · Assignee: {work.claimant?.fullName ?? "-"} · Work: {work.problemTitle}
                      </span>
                    </span>
                  </span>
                  <span className="self-start">
                    <StatusBadge status={work.status} />
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)]">No urgent work waiting right now.</p>
            )}
          </div>
        </Panel>
      </section>

      <section className="hidden">
        <MiniPanel label="Category Split" value={`${topCategoryPercent}%`} note={topCategory ? `${topCategory.categoryName} work share` : "No category data"} color="#f59e0b" />
        <MiniPanel label="Average Close Time" value={`${summary.avgCloseDays}d`} note="จากงานที่ปิดแล้ว" color="#14b8a6" />
        <MiniPanel label="Waiting Close" value={String(waitingCloseCount)} note="พร้อมตรวจรับ/ปิดงาน" color="#ef4444" />
      </section>
    </AppShell>
  );
}

function KpiCard({ href, group, unreadCount, readAction, label, value, note, icon, color }: { href: string; group: NotificationGroup; unreadCount: number; readAction: (formData: FormData) => void | Promise<void>; label: string; value: string; note: string; icon: React.ReactNode; color: string }) {
  return (
    <form action={readAction}>
      <input name="group" type="hidden" value={group} />
      <input name="href" type="hidden" value={href} />
      <button
      type="submit"
      className="relative block h-full w-full rounded-2xl p-5 text-left text-white shadow-[var(--shadow)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 78%, white))` }}
      aria-label={`KPI ${label}`}
      >
      <UnreadBadge count={unreadCount} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white/80">{label}</p>
          <strong className="mt-2 block text-4xl">{value}</strong>
        </div>
        <div className="text-white/75">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-white/80">{note}</p>
      </button>
    </form>
  );
}

function Panel({ title, icon, aside, children }: { title: string; icon: React.ReactNode; aside: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-3 text-xl font-bold sm:text-2xl">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        <span className="shrink-0 text-sm text-[var(--muted)]">{aside}</span>
      </div>
      {children}
    </section>
  );
}

function normalizeDashboardCategory(value?: string): DashboardCategoryFilter | undefined {
  return value === "mechanical" || value === "electrical" ? value : undefined;
}

function readDateFilterInput(params: DashboardSearchParams): CmDateFilterInput {
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

type YesterdayDashboardReport = {
  date: string;
  rows: Array<{
    categoryId: string;
    categoryName: string;
    newCount: number;
    inProcessCount: number;
    closedCount: number;
  }>;
  totals: {
    newCount: number;
    inProcessCount: number;
    closedCount: number;
  };
};

const dashboardDateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDashboardIsoDate(date: string) {
  return dashboardDateFormatter.format(new Date(`${date}T00:00:00+07:00`));
}

function buildWorkHref(categoryParam: string, filters: { status?: WorkStatus; statusGroup?: string } = {}) {
  const params = new URLSearchParams(categoryParam);
  if (filters.status) params.set("status", filters.status);
  if (filters.statusGroup) params.set("statusGroup", filters.statusGroup);
  const query = params.toString();
  return query ? `/work?${query}` : "/work";
}

function StatusOverviewContent({ rows, total }: { rows: { label: string; value: number; color: string }[]; total: number }) {
  const visibleRows = rows.filter((row) => row.value > 0);
  const legendRows = visibleRows.length ? visibleRows : rows;

  return (
    <div className="mt-5 grid min-h-[560px] items-center gap-7 lg:grid-cols-[minmax(240px,0.54fr)_minmax(460px,1fr)] xl:grid-cols-[minmax(260px,0.56fr)_minmax(520px,1fr)]">
      <div className="grid gap-2.5">
        {legendRows.map((row, index) => {
          const percent = total === 0 ? 0 : Math.round((row.value / total) * 100);
          return (
            <div key={`${row.label}-${index}`} className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-[var(--soft)] px-2.5 py-2 text-xs font-semibold">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[var(--surface)]">
                  <i className="h-3 w-3 rounded-sm" style={{ backgroundColor: row.color }} />
                </span>
                <span className="min-w-0 truncate">{row.label}</span>
              </span>
              <span className="shrink-0 text-xs font-black tabular-nums text-[var(--ink)]">{percent}%</span>
            </div>
          );
        })}
      </div>
      <Donut rows={rows} total={total} centerLabel="Total CM" />
    </div>
  );
}

function YesterdayCategoryReport({ report }: { report: YesterdayDashboardReport }) {
  const rows = report.rows
    .map((row) => ({ ...row, total: row.newCount + row.inProcessCount + row.closedCount }))
    .sort((a, b) => b.total - a.total || a.categoryName.localeCompare(b.categoryName));
  const visibleRows = rows.filter((row) => row.total > 0);
  const hasData = visibleRows.length > 0;

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <YesterdayMetric label="แจ้งใหม่" value={report.totals.newCount} color="#3b82f6" />
        <YesterdayMetric label="กำลังดำเนินการ" value={report.totals.inProcessCount} color="#14b8a6" />
        <YesterdayMetric label="ปิดงาน" value={report.totals.closedCount} color="#22c55e" />
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3">
        {hasData ? (
          <div className="grid gap-2">
            {visibleRows.map((row) => (
              <div key={row.categoryId} className="rounded-xl bg-[var(--surface)] px-3 py-2 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong className="truncate text-sm">{row.categoryName}</strong>
                  <span className="rounded-full bg-[var(--soft)] px-2.5 py-1 text-xs font-black">{row.total} งาน</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-semibold text-[var(--muted)]">
                  <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-blue-600">ใหม่ {row.newCount}</span>
                  <span className="rounded-lg bg-teal-500/10 px-2 py-1 text-teal-600">ดำเนินการ {row.inProcessCount}</span>
                  <span className="rounded-lg bg-green-500/10 px-2 py-1 text-green-600">ปิด {row.closedCount}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-[var(--surface)] p-4 text-center text-sm font-semibold text-[var(--muted)]">ไม่มีงานในรายงานเมื่อวาน</p>
        )}
      </div>
    </div>
  );
}

function YesterdayMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <strong className="mt-1 block text-3xl tabular-nums" style={{ color }}>
        {value}
      </strong>
    </div>
  );
}

function Donut({ rows, total, centerLabel }: { rows: { label: string; value: number; color: string }[]; total: number; centerLabel: string }) {
  const size = 260;
  const center = size / 2;
  const radius = 86;
  const strokeWidth = 30;
  const circumference = 2 * Math.PI * radius;
  const gap = 5;
  let offset = 0;
  const segments = rows
    .filter((row) => row.value > 0)
    .map((row) => {
      const segmentLength = (row.value / Math.max(total, 1)) * circumference;
      const dashLength = Math.max(1, segmentLength - gap);
      const segment = {
        ...row,
        dashArray: `${dashLength} ${circumference - dashLength}`,
        dashOffset: -offset,
      };
      offset += segmentLength;
      return segment;
    });

  return (
    <div className="cm-donut-motion relative mx-auto grid h-[340px] w-[340px] max-w-full place-items-center sm:h-[500px] sm:w-[500px] xl:h-[560px] xl:w-[560px]">
      <svg aria-hidden="true" className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} fill="none" r={radius} stroke="var(--soft)" strokeWidth={strokeWidth} />
        {segments.length ? (
          segments.map((segment, index) => (
            <circle
              key={`${segment.label}-${index}`}
              cx={center}
              cy={center}
              fill="none"
              r={radius}
              stroke={segment.color}
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.dashOffset}
              strokeLinecap="butt"
              strokeWidth={strokeWidth}
            />
          ))
        ) : (
          <circle cx={center} cy={center} fill="none" r={radius} stroke="var(--line)" strokeDasharray={`${circumference - gap} ${gap}`} strokeWidth={strokeWidth} />
        )}
      </svg>
      <div className="absolute inset-0 z-10 grid place-items-center text-center">
        <span className="cm-donut-core">
          <small className="block text-sm font-semibold text-[var(--muted)]">{centerLabel}</small>
          <strong className="block text-5xl font-black sm:text-6xl">{total}</strong>
        </span>
      </div>
    </div>
  );
}

function Legend({ rows, total }: { rows: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="mx-auto grid w-full max-w-[260px] gap-1.5 lg:mx-0 lg:max-w-[230px] lg:justify-self-end">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--soft)] px-2.5 py-1.5 text-sm">
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
  const axisMax = Math.max(1, Math.ceil(max / 10) * 10);
  const axisLabels = Array.from({ length: 6 }, (_, index) => Math.round(axisMax - (axisMax / 5) * index));
  const legendStatuses = [
    WorkStatus.NEW,
    WorkStatus.WAITING_TO_CLAIM,
    WorkStatus.CLAIMED,
    WorkStatus.IN_PROGRESS,
    WorkStatus.BACKLOG_SHUTDOWN,
    WorkStatus.WAITING_TO_CLOSE,
    WorkStatus.RETURNED_FOR_CORRECTION,
    WorkStatus.CLOSED,
    WorkStatus.CANCELED,
  ];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-[11px] text-[var(--muted)] sm:justify-end sm:text-xs">
        {legendStatuses.map((status) => (
          <LegendKey key={status} color={statusColors[status]} label={statusLabels[status]} />
        ))}
      </div>
      <div className="mt-4 overflow-visible rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 pb-4 pt-5 sm:px-5">
        <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 sm:grid-cols-[42px_minmax(0,1fr)] sm:gap-3">
          <div className="grid h-[500px] grid-rows-6 pb-12 pt-3 text-right text-[11px] font-semibold text-[var(--muted)]">
            {axisLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="relative">
            <div className="absolute inset-x-0 top-3 bottom-12 grid grid-rows-5" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} className="border-t border-[var(--line)]" />
              ))}
            </div>
            <div
              className="monthly-trend-grid relative z-10 grid h-[500px] items-end gap-2 sm:gap-3"
              style={{
                "--month-count": Math.max(rows.length, 1),
              } as React.CSSProperties}
            >
              {rows.map((row, index) => (
                <MonthlyBar key={row.key} row={row} max={axisMax} index={index} hiddenOnMobile={index < rows.length - 3} />
              ))}
            </div>
          </div>
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

function MonthlyBar({ row, max, index, hiddenOnMobile }: { row: MonthlyTrendRow; max: number; index: number; hiddenOnMobile?: boolean }) {
  const followUpStatuses = [
    WorkStatus.WAITING_TO_CLAIM,
    WorkStatus.CLAIMED,
    WorkStatus.IN_PROGRESS,
    WorkStatus.BACKLOG_SHUTDOWN,
    WorkStatus.WAITING_TO_CLOSE,
    WorkStatus.RETURNED_FOR_CORRECTION,
    WorkStatus.CLOSED,
    WorkStatus.CANCELED,
  ];
  const newCount = getStatusCount(row, WorkStatus.NEW);
  const followUpTotal = getFollowUpStatusTotal(row);
  const maxHeight = 430;
  const newHeight = newCount === 0 ? 12 : Math.max(24, Math.round((newCount / max) * maxHeight));
  const followUpHeight = followUpTotal === 0 ? 12 : Math.max(24, Math.round((followUpTotal / max) * maxHeight));
  const tooltipRows = [WorkStatus.NEW, ...followUpStatuses].map((status) => ({
    label: statusLabels[status],
    value: getStatusCount(row, status),
    color: statusColors[status],
  }));

  return (
    <div
      aria-label={`${row.label}: แจ้งใหม่ ${newCount}, งานต่อเนื่อง ${followUpTotal}, รวม ${row.total}`}
      className={`group relative h-[500px] min-w-0 grid-rows-[1fr_auto_auto] items-end gap-1.5 text-center outline-none ${hiddenOnMobile ? "hidden md:grid" : "grid"}`}
      role="img"
      tabIndex={0}
    >
      <div className="pointer-events-none absolute left-1/2 top-8 z-30 w-60 -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left text-xs opacity-0 shadow-xl transition duration-200 group-hover:opacity-100 group-focus:opacity-100">
        <p className="font-black text-[var(--ink)]">{row.label}</p>
        <p className="mt-1 text-[var(--muted)]">Total {row.total} jobs</p>
        <div className="mt-3 grid gap-1.5">
          {tooltipRows.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <strong className="tabular-nums">{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto grid h-[452px] w-full grid-cols-[minmax(22px,34px)_minmax(22px,34px)] items-end justify-center gap-2 pb-0 sm:grid-cols-[30px_30px] sm:gap-3 xl:grid-cols-[34px_34px]">
        <span className="cm-monthly-bar flex w-full overflow-hidden rounded-t-md bg-[var(--line)]" style={{ height: newHeight, "--cm-delay": `${index * 90}ms` } as React.CSSProperties}>
          <i className="block h-full w-full" style={{ backgroundColor: statusColors[WorkStatus.NEW] }} />
        </span>
        <span className="cm-monthly-bar flex w-full flex-col-reverse overflow-hidden rounded-t-md bg-[var(--line)]" style={{ height: followUpHeight, "--cm-delay": `${index * 90 + 70}ms` } as React.CSSProperties}>
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
      <span className="whitespace-nowrap text-[10px] text-[var(--muted)] sm:text-xs">{row.label}</span>
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
    getStatusCount(row, WorkStatus.BACKLOG_SHUTDOWN) +
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
    case WorkStatus.BACKLOG_SHUTDOWN:
      return work.statusHistory[0]?.changedAt ?? work.inProgressAt ?? work.createdAt;
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

function MiniPanel({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">{label}</p>
        <Gauge size={20} style={{ color }} />
      </div>
      <strong className="mt-4 block text-4xl" style={{ color }}>
        {value}
      </strong>
      <p className="mt-2 text-sm text-[var(--muted)]">{note}</p>
    </section>
  );
}
