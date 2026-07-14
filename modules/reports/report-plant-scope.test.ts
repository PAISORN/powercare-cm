import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("report query plant scope", () => {
  it("filters CM report rows by plantId when provided", () => {
    const source = readFileSync("modules/reports/report-query.ts", "utf8");

    expect(source).toContain("buildReportWhere(filter: ReportFilter, scope?: ReportScope)");
    expect(source).toContain("...(scope?.plantId ? { plantId: scope.plantId } : scope?.organizationId ? { organizationId: scope.organizationId } : {})");
    expect(source).toContain("queryReportPreview(filter: ReportFilter, take = 50, scope?: ReportScope)");
    expect(source).toContain("queryReportRows(filter: ReportFilter, scope?: ReportScope)");
  });
});
