import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard default window wiring", () => {
  it("uses explicit date detection and query-limited priority rows", () => {
    const source = readFileSync("app/dashboard/page.tsx", "utf8");

    expect(source).toContain("hasExplicitCmDateFilter");
    expect(source).toContain("getDashboardSummaryForDateFilter");
    expect(source).not.toContain("priorityWorks.slice(0, 5)");
    expect(source).toContain("summary.monthlyTrend.slice(-6)");
    expect(source).toContain("xl:grid-cols-[2fr_3fr]");
    expect(source).toContain("รายการงาน Backlog Shutdown");
    expect(source).toContain("งานที่ยังต้องดำเนินการ");
    expect(source).toContain("activeBreakdownStatuses");
    expect(source).toContain('centerLabel="Active Work"');
    expect(source).toContain(".filter((item) => item.value > 0)");
    expect(source).toContain("latestWorkActivities");
    expect(source).toContain("latestStoreIssues");
    expect(source).toContain("ความเคลื่อนไหวล่าสุด");
  });

  it("shows the dashboard module tabs with future modules disabled", () => {
    const source = readFileSync("components/dashboard-filter-bar.tsx", "utf8");

    expect(source).toContain("ประเภท Dashboard");
    expect(source).toContain('["PM", "Store"]');
    expect(source).toContain('aria-selected="true"');
    expect(source).toContain('aria-disabled="true"');
    expect(source).toContain("เร็วๆ นี้");
  });
});
