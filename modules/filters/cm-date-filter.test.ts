import { describe, expect, it } from "vitest";
import { hasExplicitCmDateFilter, parseCmDateFilter } from "./cm-date-filter";

describe("CM date filter", () => {
  it("detects whether the user explicitly selected a date filter", () => {
    expect(hasExplicitCmDateFilter({})).toBe(false);
    expect(hasExplicitCmDateFilter({ mode: "range", startDate: "2026-01-01", endDate: "2026-01-31" })).toBe(true);
    expect(hasExplicitCmDateFilter({ mode: "all" })).toBe(true);
  });

  it("parses a custom Bangkok range", () => {
    const result = parseCmDateFilter({ mode: "range", startDate: "2026-01-01", endDate: "2026-01-31" });

    expect(result.mode).toBe("range");
    expect(result.start?.toISOString()).toBe("2025-12-31T17:00:00.000Z");
    expect(result.endExclusive?.toISOString()).toBe("2026-01-31T17:00:00.000Z");
    expect(result.bucket).toBe("day");
  });

  it("rejects an end date before the start date", () => {
    expect(() => parseCmDateFilter({ mode: "range", startDate: "2026-02-01", endDate: "2026-01-31" })).toThrow(
      "End date must not be before start date",
    );
  });

  it("uses month buckets beyond 31 days", () => {
    expect(parseCmDateFilter({ mode: "range", startDate: "2026-01-01", endDate: "2026-06-30" }).bucket).toBe("month");
  });
});
