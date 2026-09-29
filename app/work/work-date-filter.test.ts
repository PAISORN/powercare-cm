import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("All Work date filtering", () => {
  const source = [
    "modules/cm-work/work-list-page-data.ts",
    "modules/cm-work/work-list-query.ts",
    "components/work-list-page/work-list-workspace.tsx",
  ].map((file) => readFileSync(file, "utf8")).join("\n");

  it("uses the shared Bangkok date range and preserves its query fields", () => {
    expect(source).toContain("parseCmDateFilter");
    expect(source).toContain("dateFilter.start");
    expect(source).toContain("dateFilter.endExclusive");
    expect(source).not.toContain("function monthRange");
    for (const key of ["mode", "date", "startDate", "endDate", "month", "year"]) {
      expect(source).toContain(`"${key}"`);
    }
  });

  it("uses the dashboard year-to-date period when no date filter is selected", () => {
    expect(source).toContain("hasExplicitCmDateFilter");
    expect(source).toContain('getCmDatePreset("yearToDate"');
    expect(source).toContain("initiallyUnset={!data.hasExplicitDateFilter}");
  });
});
