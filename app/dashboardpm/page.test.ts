import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readPmCalendarFeatureSource() {
  return [
    "app/dashboardpm/calendar/page.tsx",
    "app/dashboardpm/actions.ts",
    "modules/pm/pm-calendar-page-data.ts",
    "modules/pm/pm-calendar-page-model.ts",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
}

describe("PM route authorization", () => {
  it("protects the dashboard, calendar and work routes with view permission", () => {
    for (const path of [
      "app/dashboardpm/page.tsx",
      "app/dashboardpm/calendar/page.tsx",
      "app/dashboardpm/setup/page.tsx",
      "app/dashboardpm/work/page.tsx",
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("canViewPm(user)");
      expect(source).toContain("resolvePmPageScope(user");
    }
  });

  it("keeps the PM dashboard distinct from the calendar and links the operational drill-downs", () => {
    const dashboard = readFileSync("app/dashboardpm/page.tsx", "utf8");
    const metricCarousel = readFileSync("components/pm/pm-metric-carousel.tsx", "utf8");
    const calendar = readFileSync("app/dashboardpm/calendar/page.tsx", "utf8");
    expect(dashboard).toContain("getPmDashboardSummary");
    expect(dashboard).toContain("Dashboard PM");
    expect(dashboard).toContain("PmDashboardMonthlyTrend");
    expect(dashboard).toContain("dashboard.monthlyTrend");
    expect(dashboard).toContain("งานที่ต้องติดตาม");
    expect(dashboard).toContain("แผน PM 7 วันข้างหน้า");
    expect(dashboard).toContain('title="Comments PM"');
    expect(dashboard).toContain('label="งานทั้งปี"');
    expect(dashboard).toContain('label="ดำเนินการแล้วตลอดปี"');
    expect(dashboard).toContain('label="งานในเดือนนี้"');
    expect(dashboard).toContain('label="วันที่ยกเลิก PM"');
    expect(dashboard).toContain('label="งานวันนี้"');
    expect(dashboard.match(/<MetricLink/g)).toHaveLength(5);
    expect(dashboard).toContain("dashboard.metrics.cancellationPercent");
    expect(dashboard).toContain("dashboard.metrics.todayCompletionPercent");
    expect(dashboard).toContain("<PmMetricCarousel>");
    expect(dashboard).toContain("initialOnMobile");
    expect(dashboard.indexOf('label="งานวันนี้"')).toBeLessThan(
      dashboard.indexOf('label="วันที่ยกเลิก PM"'),
    );
    expect(metricCarousel).toContain("data-pm-metrics-carousel");
    expect(metricCarousel).toContain("data-pm-metric-initial");
    expect(metricCarousel).toContain('window.matchMedia("(max-width: 639px)")');
    expect(metricCarousel).toContain("carousel.scrollTo({ left: centeredLeft");
    expect(metricCarousel).toContain("snap-x snap-mandatory");
    expect(metricCarousel).toContain("-mx-5 -my-6 flex snap-x");
    expect(metricCarousel).toContain("pb-6 pl-5 pt-6");
    expect(dashboard).toContain("w-[88%] shrink-0 snap-center");
    expect(metricCarousel).toContain("sm:grid sm:grid-cols-2");
    const globalCss = readFileSync("app/globals.css", "utf8");
    expect(dashboard.match(/tone="/g)).toHaveLength(5);
    expect(dashboard.match(/dashboard-content-surface/g)).toHaveLength(4);
    expect(readFileSync("components/pm/pm-dashboard-monthly-trend.tsx", "utf8")).toContain(
      "dashboard-content-surface",
    );
    expect(globalCss).toContain("linear-gradient(135deg, #f5faff 0%, #edf6fb 52%, #dceaf3 100%)");
    expect(globalCss).toContain(".pm-jewel-metric:hover::before");
    expect(dashboard.indexOf("แผน PM 7 วันข้างหน้า")).toBeLessThan(
      dashboard.indexOf("<PmDashboardMonthlyTrend"),
    );
    expect(dashboard.indexOf('title="งานที่ต้องติดตาม"')).toBeLessThan(
      dashboard.indexOf('title="Comments PM"'),
    );
    expect(dashboard).toContain("ภาระงานผู้รับผิดชอบ");
    expect(dashboard).toContain("/dashboardpm/calendar?");
    expect(dashboard).not.toContain("<PmCalendar");
    expect(calendar).toContain("<PmCalendar");
  });

  it("protects PM Group management separately", () => {
    const source = readFileSync("app/dashboardpm/groups/page.tsx", "utf8");
    expect(source).toContain("canManagePmGroups(user)");
    expect(source).toContain("resolvePmPageScope(user");
  });

  it("passes the resolved scope and current route action into PM shells outside the calendar", () => {
    const routes = [
      [
        "app/dashboardpm/groups/page.tsx",
        "scope={scope}",
        'scopeAction="/dashboardpm/groups"',
        'currentPage="groups"',
      ],
      [
        "app/dashboardpm/work/page.tsx",
        "scope={scope}",
        'scopeAction="/dashboardpm/work"',
        'currentPage="work"',
      ],
    ];
    for (const [path, ...expected] of routes) {
      const source = readFileSync(path, "utf8");
      for (const value of expected) expect(source).toContain(value);
    }
  });

  it("shows calendar content without the redundant PM heading box and section tabs", () => {
    const source = readPmCalendarFeatureSource();
    expect(source).not.toContain("PmRouteShell");
    expect(source).not.toContain('currentPage="calendar"');
    expect(source).toMatch(/<AdminSiteScopeSelector\s+action="\/dashboardpm\/calendar"/);
    expect(source).toContain("<PmCalendarViewSwitcher");
    expect(source).toMatch(/view === "month"\s*\?\s*\(\s*<PmCalendar/);
    expect(source).toContain("viewSwitcher={");
  });

  it("implements Draft planning through server-authorized services without creating work or numbers", () => {
    const source = readPmCalendarFeatureSource();
    expect(source).toContain("canManagePmPlans(user)");
    expect(source).toContain("createOrGetDraftPmPlan");
    expect(source).toContain("addDraftPmGroup");
    expect(source).toContain("removeDraftPmGroup");
    expect(source).toContain("rescheduleDraftPmPlan");
    expect(source).toContain("deleteDraftPmPlan");
    expect(source).toContain("confirmPmPlan");
    expect(source).not.toContain("pmWork.create");
    expect(source).not.toContain("reservePmPlanNumber");
  });

  it("exposes scoped Confirmed-plan changes through authenticated Server Actions", () => {
    const source = readPmCalendarFeatureSource();
    expect(source).toContain("addAssetToConfirmedPmPlan");
    expect(source).toContain("rescheduleConfirmedPmPlan");
    expect(source).toContain("cancelConfirmedPmPlan");
    expect(source).toContain("await actionContext(data)");
    expect(source).toContain('registrationStatus: "ACTIVE"');
    expect(source).toContain('reason: String(data.get("reason")');
    expect(source).toContain("PmConfirmedPlanEditor");
  });

  it("strictly validates route month/date keys and preserves calendar context through actions", () => {
    const source = readPmCalendarFeatureSource();
    expect(source).toContain("isIsoDateKey(value)");
    expect(source).toContain("isPmMonthKey(value)");
    expect(source).toMatch(
      /month:\s*currentDate\.slice\(0, 7\),[\s\S]*?date:\s*currentDate,[\s\S]*?planId,[\s\S]*?error:\s*errorMessage\(error\)/,
    );
    expect(source).toMatch(
      /month:\s*currentDate\.slice\(0, 7\),[\s\S]*?date:\s*currentDate,[\s\S]*?saved:\s*"deleted"/,
    );
    expect(source).toMatch(
      /month:\s*date\.slice\(0, 7\),[\s\S]*?date,[\s\S]*?planId,[\s\S]*?saved:\s*"rescheduled"/,
    );
  });

  it("connects an individual Active Annual target to the start-PM popup and labels inactive plans accurately", () => {
    const calendar = readPmCalendarFeatureSource();
    const setup = readFileSync("app/dashboardpm/setup/page.tsx", "utf8");
    expect(calendar).toMatch(/query\.release\s*===\s*"annual"/);
    expect(calendar).toContain('aria-label="เริ่มดำเนินการ PM"');
    expect(calendar).toContain("data-pm-annual-release-dialog");
    expect(calendar).toContain("bg-red-500");
    expect(calendar).toContain("annualPlanId?: string");
    expect(calendar).toMatch(/scheduleIds:\s*\[scheduleId\]/);
    expect(calendar).toContain("activateAnnualPmPlan");
    expect(calendar).toMatch(/annualPlan\.status\s*===\s*"DRAFT"/);
    expect(calendar).toContain("/dashboardpm/annual/");
    expect(setup).toContain("Canceled plan");
    expect(setup).toContain("Superseded plan");
    expect(setup).toContain(
      "!plans.some(item=>item.status===PmAnnualPlanStatus.DRAFT||item.status===PmAnnualPlanStatus.ACTIVE)",
    );
  });

  it("supports explicit month and day calendar views without changing PM data semantics", () => {
    const source = readPmCalendarFeatureSource();
    expect(source).toContain("function validPmCalendarView(");
    expect(source).toMatch(/<PmCalendarViewSwitcher[\s\S]*?view=\{view\}/);
    expect(source).toMatch(/view === "month"\s*\?\s*\(\s*<PmCalendar/);
    expect(source).toContain("<PmDayColumn");
    expect(source).toContain("today={today}");
    expect(source).toContain("max-w-[1680px]");
    expect(source).not.toContain("min-[1900px]:grid-cols");
    expect(source).not.toContain("วันที่เลือก</p>");
  });
});
