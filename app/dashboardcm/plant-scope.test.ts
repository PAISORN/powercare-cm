import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard plant scope", () => {
  it("uses the selected Owner Admin site and keeps other roles operationally scoped", () => {
    const pageSource = readFileSync("app/dashboardcm/page.tsx", "utf8");
    const dataSource = readFileSync(
      "modules/dashboard/dashboard-page-data.ts",
      "utf8",
    );

    expect(pageSource).toContain("buildUserOperationalScope");
    expect(pageSource).toContain("user.role === RoleName.ADMIN");
    expect(pageSource).toContain("await resolveAdminSiteScope(user, params)");
    expect(pageSource).toContain(": buildUserOperationalScope(user)");
    expect(pageSource).toContain("organizationId: ownerAdminScope.organization.id");
    expect(pageSource).toContain("plantId: ownerAdminScope.plant.id");
    expect(pageSource).toContain("loadCmDashboardPageData({");
    expect(pageSource).toContain("category: activeCategoryFilter");
    expect(pageSource).toContain("dateFilter: activeDateFilter");
    expect(pageSource).toContain("reportDate: params.reportDate");
    expect(pageSource).toContain("scope,");
    expect(dataSource).toContain("getDashboardSummaryForDateFilter({");
    expect(dataSource).toContain("defaultTrendMonthCount: 12");
    expect(dataSource).toContain("getUnreadSummary(userId, scope)");
  });
});
