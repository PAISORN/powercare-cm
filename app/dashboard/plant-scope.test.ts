import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard plant scope", () => {
  it("uses operational plant scope so admins can view all plants and plant roles stay scoped", () => {
    const source = readFileSync("app/dashboard/page.tsx", "utf8");

    expect(source).toContain("buildUserOperationalScope");
    expect(source).toContain("const scope = buildUserOperationalScope(user)");
    expect(source).toContain("getDashboardSummaryForDateFilter({ category: activeCategoryFilter, dateFilter: activeDateFilter, defaultTrendMonthCount: 12, scope })");
    expect(source).toContain("getUnreadSummary(user.id, scope)");
  });
});
