import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Annual PM Setup route", () => {
  const source = readFileSync("app/dashboardpm/setup/page.tsx", "utf8");
  const service = readFileSync("modules/pm/pm-annual-service.ts", "utf8");

  it("uses authenticated scoped Server Actions and creates no PM Work", () => {
    expect(source).toContain("await requireUser()");
    expect(source).toContain("resolvePmPageScope(user");
    expect(source).toContain("canManagePmPlans(user)");
    expect(service).not.toContain("pmWork.create");
  });

  it("provides Year and Month views plus a blurred right-side daily editor", () => {
    expect(source).toContain('query.view === "year"');
    expect(source).toContain("<MonthCalendar");
    expect(source).toContain('className="fixed inset-0 z-[80] bg-slate-950/30 backdrop-blur-sm"');
    expect(source).toContain('className="fixed inset-y-0 right-0');
  });

  it("stacks dense month and daily-editor controls on narrow mobile screens", () => {
    expect(source).toContain('className="flex w-full items-center gap-2 sm:w-auto"');
    expect(source).toContain('className="min-w-0 flex-1 text-center sm:min-w-40 sm:flex-none"');
    expect(source).toContain('className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,auto)]"');
    expect(source).toContain('className="grid min-w-0 gap-2"');
    expect(source).not.toContain('className="grid min-w-52 gap-2"');
  });

  it("matches the seven-column PM Calendar card layout in Month view", () => {
    expect(source).toContain("pmMonthGrid(monthKey)");
    expect(source).toContain("calendarWeekdays.map");
    expect(source).toContain("lg:grid-cols-7");
    expect(source).toContain("lg:h-[156px]");
    expect(source).toContain("weekdayCardTones[index % 7]");
    expect(source).toContain("data-pm-setup-day-card");
    expect(source).toContain("visibleRows = dayRows.slice(0, 2)");
  });

  it("groups Annual Setup, Site Calendar, plan settings, and Weekly Pattern in one card", () => {
    expect(source).toContain("data-pm-setup-unified-card");
    expect(source).toContain('className="mt-5 border-t border-[var(--line)] pt-5"');
    expect(source).toContain("data-pm-plan-settings");
    expect(source).toContain("data-pm-weekly-pattern");
    expect(source).toContain("</>:null}</section>{plan ? <>");
  });

  it("preserves scroll position for calendar links and mutations", () => {
    expect(source).toContain("PreserveListPositionLink");
    expect(source).toContain("PreserveListPositionForm");
    expect(source).toContain("RestoreListPosition");
  });

  it("supports patterns, manual entries, No-PM exceptions, ranges and activation", () => {
    for (const action of ["saveAnnualWeeklyPattern", "applyAnnualWeeklyPattern", "addAnnualPmSchedule", "cancelAnnualPmSchedule", "changeAnnualPmSchedule", "cancelAnnualPmRange", "activateAnnualPmPlan"]) expect(source).toContain(action);
    expect(service).toContain('overrideAction: "NO_PM"');
    expect(service).toContain('overrideAction: "CHANGE"');
    expect(service).toContain("originalScheduleId: original.id");
    expect(service).toContain("activeKey: `${plan.plantId}:${plan.year}`");
  });
});
