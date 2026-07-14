import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("unified report layout", () => {
  it("places the compact daily summary above the CM report result table", () => {
    const source = readFileSync("app/reports/report-page-parts.tsx", "utf8");
    const filterIndex = source.indexOf("<ReportFilterForm");
    const matchingResultsIndex = source.indexOf("Matching results");
    const reportPreviewIndex = source.indexOf("<ReportPreview rows={rows} />");
    const dailySummaryIndex = source.indexOf("{dailyReport ? <CmReportDailySummary report={dailyReport} /> : null}");

    expect(filterIndex).toBeGreaterThan(-1);
    expect(matchingResultsIndex).toBeGreaterThan(-1);
    expect(dailySummaryIndex).toBeGreaterThan(filterIndex);
    expect(dailySummaryIndex).toBeLessThan(matchingResultsIndex);
    expect(reportPreviewIndex).toBeGreaterThan(matchingResultsIndex);
  });

  it("adds only compact new and closed work counts to the unified CM report page", () => {
    const source = readFileSync("app/reports/report-page-parts.tsx", "utf8");
    const summarySource = source.slice(source.indexOf("function CmReportDailySummary"));

    expect(summarySource).toContain('DailyMetricCard label="แจ้งซ่อมใหม่"');
    expect(summarySource).toContain('DailyMetricCard label="ปิดงาน"');
    expect(summarySource).not.toContain("<DailyWorkList");
  });
});
