import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("report pages plant scope", () => {
  it("uses operational plant scope for the unified report preview, filters, and daily summary", () => {
    const index = readFileSync("app/reports/page.tsx", "utf8");
    const daily = readFileSync("app/reports/daily/page.tsx", "utf8");
    const cm = readFileSync("app/reports/cm/page.tsx", "utf8");

    expect(index).toContain("const scope = buildReportScope(user)");

    expect(index).toContain("canViewReports");
    expect(index).toContain("queryReportPreview(filter, 50, scope)");
    expect(index).toContain("queryDailyReport(dailyFilter, scope)");
    expect(index).toContain("getActiveZonesForReportScope(scope)");
    expect(index).toContain("dailyReport={dailyReport}");
    expect(cm).toContain("redirect(\"/reports\")");
    expect(daily).toContain("redirect(\"/reports\")");
  });

  it("uses export scope for report exports and printable reports", () => {
    const exportRoute = readFileSync("app/reports/export/route.ts", "utf8");
    const print = readFileSync("app/reports/print/page.tsx", "utf8");

    for (const source of [exportRoute, print]) {
      expect(source).toContain("canExportReports");
      expect(source).toContain("buildReportScope(user)");
      expect(source).toContain("queryReportRows(filter, scope)");
      expect(source).not.toContain("resolveUserPlantId(user)");
    }
  });
});
