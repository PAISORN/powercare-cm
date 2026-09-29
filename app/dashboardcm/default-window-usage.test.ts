import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard default window wiring", () => {
  it("uses explicit date detection and query-limited priority rows", () => {
    const source = [
      readFileSync("app/dashboardcm/page.tsx", "utf8"),
      readFileSync("modules/dashboard/dashboard-page-data.ts", "utf8"),
      readFileSync("modules/dashboard/dashboard-page-model.ts", "utf8"),
    ].join("\n");
    expect(source).toContain("hasExplicitCmDateFilter");
    expect(source).toContain("getDashboardSummaryForDateFilter");
    expect(source).toContain("summary.monthlyTrend.slice(-6)");
    expect(source).toContain("latestStoreIssues");
  });

  it("exposes Store Dashboard through the shared Dashboard submenu", () => {
    const navigation = readFileSync("components/app-navigation/app-navigation-model.ts", "utf8");
    expect(navigation).toContain('label: "Dashboard Store"');
    expect(navigation).toContain('href: "/dashboardstore"');
    expect(navigation).toContain('parentSectionId: "dashboard"');
  });

  it("keeps CM panel tones and makes KPI cards swipeable with accent glow", () => {
    const page = readFileSync("app/dashboardcm/page.tsx", "utf8");
    const visuals = readFileSync("app/dashboardcm/cm-dashboard-visuals.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");
    expect(page).toContain("dashboard-kpi-carousel dashboard-kpi-grid");
    expect(visuals).not.toContain("dashboard-content-surface dashboard-panel ops-panel");
    expect(visuals).toContain("dashboard-kpi-slide relative h-full");
    expect(visuals).toContain("dashboard-kpi relative block");
    expect(visuals).toContain('style={{ "--kpi-color": color }');
    expect(styles).toContain("scroll-snap-type: inline mandatory");
    expect(styles).toContain("var(--kpi-glow-shadow)");
  });

  it("shows the CM organization and site selector to Owner Admin only", () => {
    const page = readFileSync("app/dashboardcm/page.tsx", "utf8");
    const filter = readFileSync("components/dashboard-filter-bar.tsx", "utf8");
    expect(page).toContain("user.role === RoleName.ADMIN");
    expect(page).toContain("await resolveAdminSiteScope(user, params)");
    expect(page).toContain("{ownerAdminScope ? (");
    expect(page).toContain('<AdminSiteScopeSelector');
    expect(page).toContain('action="/dashboardcm"');
    expect(page).toContain('title="CM scope"');
    expect(page).not.toContain("scope.canSelectOrganization || scope.canSelectPlant");
    expect(filter).toContain("preservedParams");
  });
});
