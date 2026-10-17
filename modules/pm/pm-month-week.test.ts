import { describe, expect, it } from "vitest";
import { pmMonthWeekDates, pmMonthWeekRevision } from "./pm-month-week";

describe("month-specific PM weeks", () => {
  it("uses weekday occurrences, including only real dates in Week 5", () => {
    expect(pmMonthWeekDates(2027, 2, 5)).toEqual([]);
    expect(pmMonthWeekDates(2027, 3, 5)).toEqual([
      { dayOfWeek: 1, date: "2027-03-29" },
      { dayOfWeek: 2, date: "2027-03-30" },
      { dayOfWeek: 3, date: "2027-03-31" },
    ]);
    expect(pmMonthWeekDates(2027, 3, 1)).toHaveLength(7);
    expect(() => pmMonthWeekDates(2027, 3, 6)).toThrow();
    expect(() => pmMonthWeekDates(2027, 13, 1)).toThrow();
  });
  it("compares the entire persisted week independently of display order", () => {
    const a = { id: "a", scheduleDateKey: "2027-03-01", status: "SCHEDULED", slotKey: "a", assetSystemId: "sys", zoneId: null, releasedAt: null };
    const b = { ...a, id: "b", slotKey: "b" };
    expect(pmMonthWeekRevision([a, b])).toBe(pmMonthWeekRevision([b, a]));
    expect(pmMonthWeekRevision([a])).not.toBe(pmMonthWeekRevision([{ ...a, releasedAt: new Date() }]));
    expect(pmMonthWeekRevision([a])).not.toBe(pmMonthWeekRevision([{ ...a, status: "CANCELED" }]));
  });
});
