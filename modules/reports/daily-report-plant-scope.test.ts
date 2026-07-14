import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("daily report plant scope", () => {
  it("filters daily new and closed work sections by plantId", () => {
    const source = readFileSync("modules/reports/daily-report.ts", "utf8");

    expect(source).toContain("queryDailyReport(filter: DailyReportFilter, scope?: ReportScope)");
    expect(source).toContain("const scopeWhere = scope?.plantId ? { plantId: scope.plantId } : scope?.organizationId ? { organizationId: scope.organizationId } : {}");
    expect(source).toContain("...scopeWhere");
  });
});
