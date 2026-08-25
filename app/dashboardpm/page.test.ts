import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PM route authorization", () => {
  it("protects the calendar and work routes with view permission", () => {
    for (const path of ["app/dashboardpm/page.tsx", "app/dashboardpm/work/page.tsx"]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("canViewPm(user)");
      expect(source).toContain("resolvePmPageScope(user");
    }
  });

  it("protects PM Group management separately", () => {
    const source = readFileSync("app/dashboardpm/groups/page.tsx", "utf8");
    expect(source).toContain("canManagePmGroups(user)");
    expect(source).toContain("resolvePmPageScope(user");
  });

  it("passes the resolved scope and current route action into every PM shell", () => {
    const routes = [
      ["app/dashboardpm/page.tsx", 'scope={scope}', 'scopeAction="/dashboardpm"', 'currentPage="calendar"'],
      ["app/dashboardpm/groups/page.tsx", 'scope={scope}', 'scopeAction="/dashboardpm/groups"', 'currentPage="groups"'],
      ["app/dashboardpm/work/page.tsx", 'scope={scope}', 'scopeAction="/dashboardpm/work"', 'currentPage="work"'],
    ];
    for (const [path, ...expected] of routes) {
      const source = readFileSync(path, "utf8");
      for (const value of expected) expect(source).toContain(value);
    }
  });

  it("implements Draft planning through server-authorized services without creating work or numbers", () => {
    const source = readFileSync("app/dashboardpm/page.tsx", "utf8");
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
    const source = readFileSync("app/dashboardpm/page.tsx", "utf8");
    expect(source).toContain("addAssetToConfirmedPmPlan");
    expect(source).toContain("rescheduleConfirmedPmPlan");
    expect(source).toContain("cancelConfirmedPmPlan");
    expect(source).toContain("await actionContext(data)");
    expect(source).toContain('registrationStatus: "ACTIVE"');
    expect(source).toContain('reason: String(data.get("reason")');
    expect(source).toContain("PmConfirmedPlanEditor");
  });

  it("strictly validates route month/date keys and preserves calendar context through actions", () => {
    const source = readFileSync("app/dashboardpm/page.tsx", "utf8");
    expect(source).toContain("isIsoDateKey(value)");
    expect(source).toContain("isPmMonthKey(value)");
    expect(source).toContain('month: currentDate.slice(0, 7), date: currentDate, planId, error: errorMessage(error)');
    expect(source).toContain('month: currentDate.slice(0, 7), date: currentDate, saved: "deleted"');
    expect(source).toContain('month: date.slice(0, 7), date, planId, saved: "rescheduled"');
  });

  it("supports explicit month and day calendar views without changing PM data semantics", () => {
    const source = readFileSync("app/dashboardpm/page.tsx", "utf8");
    expect(source).toContain("function validView(value: string | undefined): PmCalendarView");
    expect(source).toContain("<PmCalendarViewSwitcher view={view}");
    expect(source).toContain('view === "month" ? <PmCalendar');
    expect(source).toContain("<PmDayColumn");
  });
});
