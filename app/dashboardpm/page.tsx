import {
  ArrowRight,
  CalendarRange,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  MessageSquareText,
  Settings2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSiteScopeSelector } from "../../components/admin-site-scope-selector";
import { PmDashboardMonthlyTrend } from "../../components/pm/pm-dashboard-monthly-trend";
import { PmDashboardStatusOverview } from "../../components/pm/pm-dashboard-status-overview";
import { PmMetricCarousel } from "../../components/pm/pm-metric-carousel";
import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { requireUser } from "../../lib/session";
import { canViewPm } from "../../modules/auth/permission";
import {
  formatPmDashboardMonth as formatMonth,
  formatPmDashboardShortDate as formatShortDate,
  getPmDashboardSummary,
} from "../../modules/pm/pm-dashboard-query";
import { resolvePmPageScope } from "../../modules/pm/pm-page-scope";

type DashboardQuery = {
  organizationId?: string;
  plantId?: string;
};

export default async function PmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardQuery>;
}) {
  const user = await requireUser();
  if (!canViewPm(user)) redirect("/dashboardcm");
  const query = await searchParams;
  const scope = await resolvePmPageScope(user, query);
  const today = getBangkokDateString();
  const serviceScope = {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  };
  const dashboard = await getPmDashboardSummary(serviceScope, today);
  const scopeQuery = new URLSearchParams(serviceScope).toString();
  const calendarHref = `/dashboardpm/calendar?${scopeQuery}&view=month&month=${dashboard.monthKey}&date=${today}`;
  const workHref = (values: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams(serviceScope);
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }
    return `/dashboardpm/work?${params}`;
  };

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-[1680px] gap-5">
      {scope.canSelectOrganization || scope.canSelectPlant ? (
        <AdminSiteScopeSelector
          action="/dashboardpm"
          description="เลือก Organization และ Site สำหรับดูภาพรวมงานบำรุงรักษาเชิงป้องกัน"
          scope={scope}
          title="PM scope"
        />
      ) : null}

      <header className="flex min-w-0 flex-col gap-5 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-4xl">
            Dashboard PM
          </h1>
          <p className="mt-2 break-words text-sm font-semibold text-[var(--muted)]">
            {scope.plant.name} · {formatMonth(dashboard.monthKey)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:transform-none"
            href={`/dashboardpm/calendar?${scopeQuery}&view=month&month=${dashboard.monthKey}&date=${today}`}
          >
            <CalendarDays aria-hidden="true" size={18} />
            เปิด PM Calendar
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-emerald-500 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:transform-none"
            href={`/dashboardpm/setup?${scopeQuery}&year=${today.slice(0, 4)}`}
          >
            <Settings2 aria-hidden="true" size={18} />
            PM Setup
          </Link>
        </div>
      </header>

      <PmMetricCarousel>
        <MetricLink
          href={workHref({
            startDate: dashboard.yearStart,
            endDate: dashboard.yearEnd,
          })}
          icon={CalendarRange}
          label="งานทั้งปี"
          tone="blue"
          value={dashboard.metrics.annualTotal}
          note={`ฐานงานตามแผนปีนี้ · ${dashboard.metrics.annualTotal ? 100 : 0}%`}
          percent={dashboard.metrics.annualTotal ? 100 : 0}
        />
        <MetricLink
          href={workHref({
            lifecycle: "COMPLETED",
            startDate: dashboard.yearStart,
            endDate: dashboard.yearEnd,
          })}
          icon={CheckCircle2}
          label="ดำเนินการแล้วตลอดปี"
          tone="green"
          value={dashboard.metrics.annualCompleted}
          note={`${dashboard.metrics.annualCompletionPercent}% ของงานทั้งปี`}
          percent={dashboard.metrics.annualCompletionPercent}
        />
        <MetricLink
          href={workHref({
            startDate: dashboard.monthStart,
            endDate: dashboard.monthEnd,
          })}
          icon={ClipboardList}
          label="งานในเดือนนี้"
          tone="violet"
          value={dashboard.metrics.monthTotal}
          note={`ดำเนินการแล้ว ${dashboard.metrics.monthCompleted} งาน · ${dashboard.metrics.monthCompletionPercent}%`}
          percent={dashboard.metrics.monthCompletionPercent}
          initialOnMobile
        />
        <MetricLink
          href={workHref({ startDate: today, endDate: today })}
          icon={CalendarDays}
          label="งานวันนี้"
          tone="amber"
          value={dashboard.metrics.todayTotal}
          note={`ดำเนินการแล้ว ${dashboard.metrics.todayCompleted} งาน · ${dashboard.metrics.todayCompletionPercent}%`}
          percent={dashboard.metrics.todayCompletionPercent}
        />
        <MetricLink
          href={workHref({
            lifecycle: "CANCELED",
            startDate: dashboard.yearStart,
            endDate: dashboard.yearEnd,
          })}
          icon={CalendarX2}
          label="วันที่ยกเลิก PM"
          tone="red"
          value={dashboard.metrics.canceledDays}
          note={`${dashboard.metrics.canceledWorks} งาน · ${dashboard.metrics.cancellationPercent}% ของงานทั้งปี`}
          percent={dashboard.metrics.cancellationPercent}
        />
      </PmMetricCarousel>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(22rem,0.72fr)_minmax(0,1.28fr)] xl:items-stretch">
        <PmDashboardStatusOverview overview={dashboard.statusOverview} />

        <PmDashboardMonthlyTrend
          calendarHref={calendarHref}
          rows={dashboard.monthlyTrend}
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <section className="dashboard-content-surface pm-pastel-surface min-w-0 overflow-hidden rounded-[2rem] border text-[#17213b]">
          <SectionHeader
            href={workHref({ overdue: "1" })}
            icon={CircleAlert}
            title="งานที่ต้องติดตาม"
          />
          {dashboard.attentionWorks.length ? (
            <div className="grid gap-2 p-3 pt-0 sm:p-4 sm:pt-0">
              {dashboard.attentionWorks.map((work, index) => (
                <Link
                  className={`min-h-20 min-w-0 gap-3 rounded-[1.35rem] border border-white/75 bg-white/55 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 motion-reduce:transform-none sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${
                    index >= 3 ? "hidden sm:grid" : "grid"
                  }`}
                  href={`/dashboardpm/work/${work.id}?${scopeQuery}`}
                  key={work.id}
                >
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black ${
                      work.overdue
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {work.overdue ? "เกินกำหนด" : "กำลังดำเนินการ"}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-[var(--ink)]">
                      {work.number} · {work.assetCodeSnapshot ?? "—"}
                    </strong>
                    <span className="mt-1 block truncate text-sm text-[var(--muted)]">
                      {work.assetNameSnapshot}
                      {work.assignees[0]?.user.fullName
                        ? ` · ${work.assignees[0].user.fullName}`
                        : " · ยังไม่มอบหมาย"}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-3 text-sm font-bold text-[var(--muted)] sm:justify-end">
                    {formatShortDate(work.pmPlan.plannedDateKey)}
                    <ArrowRight aria-hidden="true" size={17} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text="ไม่มีงานเกินกำหนดหรืองานที่กำลังดำเนินการ" />
          )}
        </section>

        <section className="dashboard-content-surface pm-pastel-surface min-w-0 overflow-hidden rounded-[2rem] border text-[#17213b]">
          <SectionHeader
            href={workHref({ lifecycle: "COMPLETED" })}
            icon={MessageSquareText}
            title="Comments PM"
          />
          {dashboard.pmComments.length ? (
            <div className="grid gap-2 p-3 pt-0 sm:p-4 sm:pt-0">
              {dashboard.pmComments.map((comment, index) => (
              <Link
                  className={`min-w-0 rounded-[1.35rem] border border-white/75 bg-white/55 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 motion-reduce:transform-none ${index >= 3 ? "hidden sm:block" : "block"}`}
                  href={`/dashboardpm/work/${comment.id}?${scopeQuery}`}
                  key={comment.id}
              >
                  <span className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${comment.result === "ABNORMAL" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {comment.result === "ABNORMAL" ? "ผิดปกติ" : "ปกติ"}
                    </span>
                    <span className="text-xs font-bold text-[var(--muted)]">
                      {comment.completedAt ? formatShortDate(comment.completedAt.toISOString().slice(0, 10)) : "ล่าสุด"}
                    </span>
                  </span>
                  <strong className="mt-2 block truncate text-sm text-[var(--ink)]">
                    {comment.number} · {comment.assetCodeSnapshot ?? "—"}
                  </strong>
                  <span className="mt-1 block line-clamp-2 text-sm font-semibold text-slate-600">
                    “{comment.resultNote}”
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-[var(--muted)]">
                    <span className="truncate">{comment.completedBy?.fullName ?? "ผู้บันทึก PM"}</span>
                    <ArrowRight aria-hidden="true" className="shrink-0" size={15} />
                  </span>
              </Link>
            ))}
          </div>
          ) : (
            <EmptyState text="ยังไม่มี Comments จากผลการตรวจ PM" />
          )}
        </section>
      </div>

      <section className="dashboard-content-surface pm-pastel-surface min-w-0 overflow-hidden rounded-[2rem] border text-[#17213b]">
        <SectionHeader
          href={workHref()}
          icon={UserRound}
          title="ภาระงานผู้รับผิดชอบ"
        />
        {dashboard.workload.length ? (
          <div className="grid gap-2 p-3 pt-0 sm:p-4 sm:pt-0">
            {dashboard.workload.map((owner) => {
              const percent = owner.total
                ? Math.round((owner.completed / owner.total) * 100)
                : 0;
              return (
                <Link
                  className="grid min-h-16 min-w-0 gap-3 rounded-[1.35rem] border border-white/75 bg-white/55 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 motion-reduce:transform-none md:grid-cols-[minmax(10rem,0.55fr)_minmax(12rem,1fr)_auto] md:items-center"
                  href={workHref({
                    assigneeId:
                      owner.id === "unassigned" ? undefined : owner.id,
                  })}
                  key={owner.id}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-[var(--ink)]">
                      {owner.name}
                    </strong>
                    <span className="text-xs font-semibold text-[var(--muted)]">
                      {owner.total} งาน
                    </span>
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className="block h-full rounded-full bg-emerald-600"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="flex flex-wrap items-center gap-3 text-xs font-bold">
                    <span className="text-emerald-700">เสร็จ {owner.completed}</span>
                    <span className="text-amber-700">กำลังทำ {owner.inProgress}</span>
                    <span className="text-red-700">เกิน {owner.overdue}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState text="ยังไม่มีภาระงาน PM ในเดือนนี้" />
        )}
      </section>
    </div>
  );
}

type IconType = typeof CalendarDays;

function MetricLink({
  href,
  icon: Icon,
  initialOnMobile = false,
  label,
  note,
  percent,
  tone,
  value,
}: {
  href: string;
  icon: IconType;
  initialOnMobile?: boolean;
  label: string;
  note: string;
  percent: number;
  tone: "blue" | "green" | "violet" | "red" | "amber";
  value: number;
}) {
  const tones = {
    blue: {
      card: "pm-jewel-metric pm-jewel-metric--blue",
      icon: "pm-jewel-icon text-sky-200",
    },
    amber: {
      card: "pm-jewel-metric pm-jewel-metric--amber",
      icon: "pm-jewel-icon text-amber-200",
    },
    red: {
      card: "pm-jewel-metric pm-jewel-metric--red",
      icon: "pm-jewel-icon text-rose-200",
    },
    green: {
      card: "pm-jewel-metric pm-jewel-metric--green",
      icon: "pm-jewel-icon text-emerald-200",
    },
    violet: {
      card: "pm-jewel-metric pm-jewel-metric--violet",
      icon: "pm-jewel-icon text-violet-200",
    },
  };
  return (
    <Link
      aria-label={`${label} ${value} — ${note}`}
      className={`group flex min-h-36 w-[88%] shrink-0 snap-center items-start gap-3 rounded-[1.75rem] border p-4 transition duration-200 hover:-translate-y-1 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 motion-reduce:transform-none sm:w-auto sm:p-5 ${tones[tone].card}`}
      data-pm-metric-initial={initialOnMobile ? "true" : undefined}
      href={href}
    >
      <span className={`mt-0.5 grid size-11 shrink-0 place-items-center rounded-full shadow-sm ${tones[tone].icon}`}>
        <Icon aria-hidden="true" size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block min-h-10 text-sm font-extrabold leading-5 text-[var(--muted)]">{label}</span>
        <strong className="mt-0.5 block text-3xl font-black leading-none text-[var(--ink)]">{value}</strong>
        <span className="mt-3 block text-xs font-bold leading-5 text-white/80">{note}</span>
        <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-black/20">
          <span
            className="block h-full rounded-full bg-white/85"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </span>
      </span>
      <ArrowRight aria-hidden="true" className="mt-3 shrink-0 text-white/70 transition group-hover:translate-x-0.5" size={17} />
    </Link>
  );
}

function SectionHeader({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: IconType;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/70 text-emerald-700 shadow-sm">
          <Icon aria-hidden="true" size={20} />
        </span>
        <h2 className="text-lg font-black text-[var(--ink)]">{title}</h2>
      </div>
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-emerald-700 hover:underline"
        href={href}
      >
        ดูทั้งหมด <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid min-h-40 place-items-center px-5 py-8 text-center">
      <span>
        <CheckCircle2 aria-hidden="true" className="mx-auto text-emerald-500" size={30} />
        <span className="mt-3 block text-sm font-bold text-[var(--muted)]">{text}</span>
      </span>
    </div>
  );
}
