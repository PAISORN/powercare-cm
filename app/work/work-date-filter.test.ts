import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("All Work date filtering", () => {
  it("uses the shared Bangkok date range and preserves its query fields", () => {
    const source = readFileSync("app/work/page.tsx", "utf8");

    expect(source).toContain("parseCmDateFilter");
    expect(source).toContain("dateFilter.start");
    expect(source).toContain("dateFilter.endExclusive");
    expect(source).not.toContain("function monthRange");
    for (const key of ["mode", "date", "startDate", "endDate", "month", "year"]) {
      expect(source).toContain(`"${key}"`);
    }
  });
});
