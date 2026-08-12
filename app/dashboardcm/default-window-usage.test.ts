import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard default window wiring", () => {
  it("uses explicit date detection and query-limited priority rows", () => {
    const source = readFileSync("app/dashboardcm/page.tsx", "utf8");
    expect(source).toContain("hasExplicitCmDateFilter");
    expect(source).toContain("getDashboardSummaryForDateFilter");
    expect(source).toContain("summary.monthlyTrend.slice(-6)");
    expect(source).toContain("latestStoreIssues");
  });

  it("exposes Store only for authorized users", () => {
    const source = readFileSync("components/dashboard-filter-bar.tsx", "utf8");
    expect(source).toContain("showStoreDashboard");
    expect(source).toContain('href="/dashboardstore"');
  });
});