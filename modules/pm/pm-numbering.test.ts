import { describe, expect, it } from "vitest";
import { formatPmPlanNumber, formatPmWorkNumber, normalizePmSiteCode } from "./pm-numbering";

describe("PM numbering", () => {
  it("formats immutable plan and work references", () => {
    expect(formatPmPlanNumber("rtb", "2026-08-15", 1)).toBe("PMP-RTB-20260815-001");
    expect(formatPmWorkNumber("rtb", "2026-08-15", 1, 12)).toBe("PM-RTB-20260815-001-012");
  });

  it("normalizes a practical Site code segment without imposing the Store inventory length", () => {
    expect(normalizePmSiteCode(" rtb-01 ")).toBe("RTB01");
    expect(normalizePmSiteCode("north-plant-1")).toBe("NORTHPLANT1");
  });

  it.each(["", "---", "   "])("rejects invalid Site code %j", (siteCode) => {
    expect(() => formatPmPlanNumber(siteCode, "2026-08-15", 1)).toThrow(/Site code/);
  });

  it("rejects an unreasonably long normalized Site code", () => {
    expect(() => formatPmPlanNumber("SITE-CODE-THAT-IS-TOO-LONG", "2026-08-15", 1)).toThrow(
      /12 characters/,
    );
  });

  it.each(["20260815", "2026-02-30", "2026-13-01", "not-a-date"])(
    "rejects invalid date key %j",
    (dateKey) => {
      expect(() => formatPmPlanNumber("RTB", dateKey, 1)).toThrow(/date key/);
    },
  );

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid plan sequence %j", (sequence) => {
    expect(() => formatPmPlanNumber("RTB", "2026-08-15", sequence)).toThrow(/positive integer/);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid work sequence %j", (sequence) => {
    expect(() => formatPmWorkNumber("RTB", "2026-08-15", 1, sequence)).toThrow(/positive integer/);
  });
});
