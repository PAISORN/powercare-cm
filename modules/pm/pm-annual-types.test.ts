import { describe, expect, it } from "vitest";
import { PmAnnualBy, annualDateRange, datesInYearForWeekday, firstWeekMonday, isoWeekday, monthlyOccurrenceForDate, monthlyPatternKey, nthWeekdayOfMonth, rotationWeekIndex, requireDateInPlanYear, targetSlotKey, validateAnnualYear, weeklyPatternKey } from "./pm-annual-types";

describe("Annual PM Setup domain rules", () => {
  it("accepts current and future years but rejects past and implausibly distant years", () => {
    expect(validateAnnualYear(2026, 2026)).toBe(2026);
    expect(validateAnnualYear(2027, 2026)).toBe(2027);
    expect(() => validateAnnualYear(2025, 2026)).toThrow(/current year/);
    expect(() => validateAnnualYear(2047, 2026)).toThrow(/current year/);
  });

  it("keeps schedule dates inside the plan year", () => {
    expect(requireDateInPlanYear("2027-12-31", 2027)).toBe("2027-12-31");
    expect(() => requireDateInPlanYear("2028-01-01", 2027)).toThrow(/Plan Year/);
  });

  it("generates Monday-first weekly dates across leap years without timezone drift", () => {
    expect(isoWeekday("2027-01-04")).toBe(1);
    const mondays = datesInYearForWeekday(2028, 1);
    expect(mondays[0]).toBe("2028-01-03");
    expect(mondays.every(date => date.startsWith("2028-") && isoWeekday(date) === 1)).toBe(true);
  });

  it("uses deterministic keys and rejects invalid weekdays", () => {
    expect(targetSlotKey("p1", "2027-01-04", PmAnnualBy.SYSTEM, "s1")).toBe("p1:2027-01-04:SYSTEM:s1");
    expect(weeklyPatternKey("p1", 1, PmAnnualBy.ZONE, "z1")).toBe("p1:1:ZONE:z1");
    expect(() => weeklyPatternKey("p1", 0, PmAnnualBy.ZONE, "z1")).toThrow(/Monday/);
  });

  it("maps Monthly Pattern occurrences to exact dates and omits a missing Week 5", () => {
    expect(nthWeekdayOfMonth(2027, 1, 1, 1)).toBe("2027-01-04");
    expect(nthWeekdayOfMonth(2027, 1, 1, 4)).toBe("2027-01-25");
    expect(nthWeekdayOfMonth(2027, 1, 1, 5)).toBeNull();
    expect(nthWeekdayOfMonth(2027, 3, 1, 5)).toBe("2027-03-29");
    expect(monthlyOccurrenceForDate("2027-03-29")).toBe(5);
  });

  it("uses a unique Monthly Pattern key for occurrence, weekday, basis, and target", () => {
    expect(monthlyPatternKey("p1", 2, 3, PmAnnualBy.SYSTEM, "sys")).toBe("p1:2:3:SYSTEM:sys");
    expect(() => monthlyPatternKey("p1", 5, 3, PmAnnualBy.SYSTEM, "sys")).toThrow(/Week 1 through Week 4/);
  });

  it("alternates Week A and B on consecutive Wednesdays across the year boundary", () => {
    expect(firstWeekMonday(2027)).toBe("2026-12-28");
    expect(rotationWeekIndex("2027-01-06", 2, "2026-12-28")).toBe(2);
    expect(rotationWeekIndex("2027-01-13", 2, "2026-12-28")).toBe(1);
    expect(rotationWeekIndex("2027-01-20", 2, "2026-12-28")).toBe(2);
    expect(rotationWeekIndex("2026-12-23", 2, "2026-12-28")).toBe(2);
    expect(rotationWeekIndex("2027-01-06", 1, null)).toBe(1);
    expect(weeklyPatternKey("p1", 3, PmAnnualBy.SYSTEM, "sys", 2)).toBe("p1:3:2:SYSTEM:sys");
    expect(() => rotationWeekIndex("2027-01-06", 2, "2027-01-01")).toThrow(/Monday/);
  });
  it("expands inclusive cancellation date ranges", () => {
    expect(annualDateRange("2026-01-01", "2026-01-04", 2026)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);
  });
});
