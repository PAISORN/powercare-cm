import {
  KpiCard,
  MiniPanel,
  MonthlyTrendPanel,
  Panel,
  StatusOverviewContent,
  YesterdayCategoryReport,
  ZoneBar,
  buildWorkHref,
  formatDashboardIsoDate,
  formatStatusDate,
  getPreviousDashboardDate,
  getStatusDate,
} from "./cm-dashboard-visuals";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Factory,
  Flame,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { DashboardFilterBar } from "../../components/dashboard-filter-bar";
import { AdminSiteScopeSelector } from "../../components/admin-site-scope-selector";
import { StatusBadge } from "../../components/status-badge";
import { UserAvatar } from "../../components/user-avatar";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { RoleName, WorkStatus } from "../../modules/cm-work/cm-work-types";
import { requireUser } from "../../lib/session";
import { buildUserOperationalScope } from "../../modules/organization/user-plant-scope";
import { resolveAdminSiteScope } from "../../modules/admin/admin-site-scope";
import { loadCmDashboardPageData } from "../../modules/dashboard/dashboard-page-data";
import {
  buildCmDashboardPageModel,
  resolveCmDashboardFilters,
  type DashboardSearchParams,
} from "../../modules/dashboard/dashboard-page-model";
import { markDashboardGroupReadAction } from "./actions";

const zoneColors = [
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#14b8a6",
  "#8b5cf6",
  "#06b6d4",
];
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const {
    activeCategoryFilter,
    activeDateFilterInput,
    hasExplicitDateFilter,
    activeDateFilter,
  } = resolveCmDashboardFilters(params);
  const ownerAdminScope =
    user.role === RoleName.ADMIN
      ? await resolveAdminSiteScope(user, params)
      : null;
  const scope = ownerAdminScope
    ? {
        organizationId: ownerAdminScope.organization.id,
        plantId: ownerAdminScope.plant.id,
      }
    : buildUserOperationalScope(user);
  const preservedScopeParams = ownerAdminScope
    ? {
        organizationId: ownerAdminScope.organization.id,
        plantId: ownerAdminScope.plant.id,
      }
    : undefined;
  const dashboardClearHref = ownerAdminScope
    ? `/dashboardcm?${new URLSearchParams(preservedScopeParams).toString()}`
    : "/dashboardcm";
  const data = await loadCmDashboardPageData({
    userId: user.id,
    scope,
    category: activeCategoryFilter,
    dateFilter: activeDateFilter,
    reportDate: params.reportDate,
  });
  const { summary, unreadSummary, dashboardCompanyName } = data;
  const {
    statusRows,
    statusTotal,
    newCount,
    closedCount,
    canceledCount,
    inProcessCount,
    waitingCloseCount,
    recentMonthlyTrend,
    latestActivities,
    topCategory,
    topCategoryPercent,
    zoneRows,
    workCategoryParam,
  } = buildCmDashboardPageModel(data);

  return (
    <>
      <div className="dashboard-glass-scope contents">
        <section className="menu-heading-plain dashboard-cm-heading cm-hero dashboard-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
          <div className="plant-skyline" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="relative z-10 grid items-end gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                <Factory size={17} />
                CM Performance Overview
              </p>
              <div className="mt-5 flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur sm:h-[72px] sm:w-[72px]"
                >
                  <Building2 size={42} strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <h1 className="max-w-5xl text-3xl font-extrabold tracking-normal sm:text-4xl">
                    ภาพรวมงานซ่อมบำรุง CM
                  </h1>
                  <p className="mt-2 max-w-3xl text-white/80">
                    ติดตามสถานะงานซ่อม งานเร่งด่วน และแนวโน้มการดำเนินงานของ{" "}
                    {dashboardCompanyName} ในมุมมองเดียว
                  </p>
                </div>
              </div>
            </div>
            <section
              aria-label="ตัวกรอง Dashboard CM"
              className="relative z-20 justify-self-end lg:mb-1"
            >
              <DashboardFilterBar
                activeCategory={activeCategoryFilter}
                activeDateFilter={
                  hasExplicitDateFilter ? activeDateFilterInput : undefined
                }
                clearHref={dashboardClearHref}
                placement="hero"
                preservedParams={preservedScopeParams}
              />
            </section>
          </div>
        </section>

        {ownerAdminScope ? (
          <div className="mt-6">
            <AdminSiteScopeSelector
              action="/dashboardcm"
              description="เลือก Organization และ Site สำหรับดู Dashboard CM"
              scope={ownerAdminScope}
              title="CM scope"
            />
          </div>
        ) : null}

        <section
          aria-label="สรุป KPI Dashboard CM"
          className="dashboard-kpi-carousel dashboard-kpi-grid mt-6 sm:grid-cols-2 sm:gap-5 xl:grid-cols-5"
        >
          <KpiCard
            href={buildWorkHref(workCategoryParam)}
            group="ALL_CM"
            unreadCount={unreadSummary.total}
            readAction={markDashboardGroupReadAction}
            label="Total CM"
            value={String(summary.total)}
            note="งานซ่อมทั้งหมด"
            icon={<ClipboardList size={34} />}
            color="#3b82f6"
          />
          <KpiCard
            href={buildWorkHref(workCategoryParam, { status: WorkStatus.NEW })}
            group="NEW"
            unreadCount={unreadSummary.newRequest}
            readAction={markDashboardGroupReadAction}
            label="New Request"
            value={String(newCount)}
            note="แจ้งซ่อมใหม่"
            icon={<CircleDot size={34} />}
            color="#06b6d4"
          />
          <KpiCard
            href={buildWorkHref(workCategoryParam, {
              statusGroup: "IN_PROCESS",
            })}
            group="IN_PROCESS"
            unreadCount={unreadSummary.inProcess}
            readAction={markDashboardGroupReadAction}
            label="In Process"
            value={String(inProcessCount)}
            note="งานอยู่ระหว่างดำเนินการ"
            icon={<Wrench size={34} />}
            color="#14b8a6"
          />
          <KpiCard
            href={buildWorkHref(workCategoryParam, {
              status: WorkStatus.CLOSED,
            })}
            group="CLOSED"
            unreadCount={unreadSummary.closed}
            readAction={markDashboardGroupReadAction}
            label="Closed"
            value={String(closedCount)}
            note="ปิดงานแล้ว"
            icon={<CheckCircle2 size={34} />}
            color="#22c55e"
          />
          <KpiCard
            href={buildWorkHref(workCategoryParam, {
              status: WorkStatus.CANCELED,
            })}
            group="CANCELED"
            unreadCount={unreadSummary.canceled}
            readAction={markDashboardGroupReadAction}
            label="Cancel"
            value={String(canceledCount)}
            note="ยกเลิก"
            icon={<AlertTriangle size={34} />}
            color="#8b5cf6"
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[2fr_3fr]">
          <Panel
            title="Status Overview"
            tone="blue"
            icon={<CircleDot size={22} className="text-[#3b82f6]" />}
            aside={
              hasExplicitDateFilter ? `${statusTotal} jobs` : "Current year"
            }
          >
            <StatusOverviewContent rows={statusRows} total={statusTotal} />
          </Panel>

          <Panel
            title="Monthly CM Trend"
            tone="mint"
            icon={<BarChart3 size={22} className="text-[#14b8a6]" />}
            aside={`${recentMonthlyTrend.length}-month view`}
          >
            <MonthlyTrendPanel rows={recentMonthlyTrend} />
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel
            title="Plant Zone Workload"
            tone="amber"
            icon={<Factory size={22} className="text-[#f59e0b]" />}
            aside={hasExplicitDateFilter ? "Top zones" : "Current year"}
          >
            <div className="mt-4 grid gap-4">
              {zoneRows.map((row, index) => (
                <ZoneBar
                  key={`${row.label}-${index}`}
                  row={row}
                  color={zoneColors[index % zoneColors.length]}
                />
              ))}
            </div>
          </Panel>

          <Panel
            title="Priority Work Queue"
            tone="rose"
            icon={<Flame size={22} className="text-[#ef4444]" />}
            aside={hasExplicitDateFilter ? "Action first" : "Top 5 priority"}
          >
            <div className="mt-4 grid gap-4">
              {summary.priorityWorks.length ? (
                summary.priorityWorks.map((work) => (
                  <Link
                    key={work.id}
                    className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 hover:bg-[var(--surface)] md:grid-cols-[1fr_auto]"
                    href={`/work/${work.id}`}
                  >
                    <span className="min-w-0">
                      <strong className="block text-lg">{work.number}</strong>
                      <span className="mt-1 block text-sm font-semibold text-[var(--ink)]">
                        Category: {work.category.name} · Zone: {work.zone.name}
                      </span>
                      <span className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                        {work.claimant ? (
                          <UserAvatar
                            fullName={work.claimant.fullName}
                            hasPhoto={Boolean(work.claimant.profilePhoto)}
                            size="sm"
                            userId={work.claimant.id}
                            version={work.claimant.profilePhoto?.updatedAt.getTime()}
                          />
                        ) : null}
                        <span>
                          Date: {formatStatusDate(getStatusDate(work))} ·
                          Assignee: {work.claimant?.fullName ?? "-"} · Work:{" "}
                          {work.problemTitle}
                        </span>
                      </span>
                    </span>
                    <span className="self-start">
                      <StatusBadge status={work.status} />
                    </span>
                  </Link>
                ))
              ) : (
                <p className="rounded-2xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)]">
                  No urgent work waiting right now.
                </p>
              )}
            </div>
          </Panel>
        </section>

        <section className="mt-6">
          <Panel
            title="ความเคลื่อนไหวล่าสุด"
            tone="violet"
            icon={<Activity size={22} className="text-[#3b82f6]" />}
            aside="CM และ Store"
          >
            <div className="mt-4 grid gap-x-6 md:grid-cols-2">
              {latestActivities.length ? (
                latestActivities.map((item) => {
                  const Icon = item.kind === "cm" ? Wrench : ShoppingCart;
                  return (
                    <Link
                      className="group grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] py-3"
                      href={item.href}
                      key={`${item.kind}-${item.id}`}
                    >
                      <span
                        className={`grid size-10 place-items-center rounded-xl ${item.kind === "cm" ? "bg-blue-500/10 text-blue-600" : "bg-violet-500/10 text-violet-600"}`}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">
                          {item.number} · {item.title}
                        </strong>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {formatThaiDateTime(item.occurredAt)}
                        </span>
                      </span>
                      <span className="max-w-28 truncate text-xs font-bold text-[var(--muted)] group-hover:text-[var(--primary)]">
                        {item.status}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="py-4 text-sm text-[var(--muted)]">
                  ยังไม่มีความเคลื่อนไหวล่าสุด
                </p>
              )}
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel
            title="รายการงาน Backlog Shutdown"
            tone="slate"
            icon={<Archive size={22} className="text-[#78716c]" />}
            aside="ล่าสุด 5 งาน"
          >
            <div className="mt-4 divide-y divide-[var(--line)]">
              {summary.backlogWorks.length ? (
                summary.backlogWorks.map((work) => (
                  <Link
                    className="grid gap-2 py-3 transition hover:bg-[var(--soft)] sm:grid-cols-[1fr_auto] sm:px-2"
                    href={`/work/${work.id}`}
                    key={work.id}
                  >
                    <span className="min-w-0">
                      <strong className="block">{work.number}</strong>
                      <span className="mt-1 block truncate text-sm text-[var(--muted)]">
                        {work.problemTitle} · {work.zone.name}
                      </span>
                    </span>
                    <StatusBadge status={work.status} />
                  </Link>
                ))
              ) : (
                <p className="py-4 text-sm text-[var(--muted)]">
                  ไม่มีงาน Backlog Shutdown
                </p>
              )}
            </div>
          </Panel>

          <Panel
            title="Report รายวัน"
            tone="mint"
            icon={<CalendarDays size={22} className="text-[#14b8a6]" />}
            aside={formatDashboardIsoDate(summary.yesterdayReport.date)}
          >
            <form
              action="/dashboardcm"
              className="mt-4 flex flex-wrap items-end gap-2"
            >
              {ownerAdminScope ? (
                <>
                  <input
                    name="organizationId"
                    type="hidden"
                    value={ownerAdminScope.organization.id}
                  />
                  <input
                    name="plantId"
                    type="hidden"
                    value={ownerAdminScope.plant.id}
                  />
                </>
              ) : null}
              {activeCategoryFilter ? (
                <input
                  name="category"
                  type="hidden"
                  value={activeCategoryFilter}
                />
              ) : null}
              <label className="grid gap-1.5 text-sm font-bold">
                เลือกวันที่ย้อนหลัง
                <input
                  aria-label="วันที่รายงานย้อนหลัง"
                  className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                  defaultValue={summary.yesterdayReport.date}
                  max={getPreviousDashboardDate()}
                  name="reportDate"
                  type="date"
                />
              </label>
              <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--primary-strong)]">
                ดูรายงาน
              </button>
            </form>
            <YesterdayCategoryReport report={summary.yesterdayReport} />
          </Panel>
        </section>

        <section className="hidden">
          <MiniPanel
            label="Category Split"
            value={`${topCategoryPercent}%`}
            note={
              topCategory
                ? `${topCategory.categoryName} work share`
                : "No category data"
            }
            color="#f59e0b"
          />
          <MiniPanel
            label="Average Close Time"
            value={`${summary.avgCloseDays}d`}
            note="จากงานที่ปิดแล้ว"
            color="#14b8a6"
          />
          <MiniPanel
            label="Waiting Close"
            value={String(waitingCloseCount)}
            note="พร้อมตรวจรับ/ปิดงาน"
            color="#ef4444"
          />
        </section>
      </div>
    </>
  );
}
