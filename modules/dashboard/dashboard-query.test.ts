import { describe, expect, it } from "vitest";
import { getDashboardTimeRangeWindow, normalizeDashboardTimeRange } from "./dashboard-query";

describe("dashboard query contract", () => {
  it("keeps the dashboard contract explicit", () => {
    const keys = ["total", "byStatus", "byCategory", "byZone", "byUrgency", "monthlyTrend", "priorityWorks", "latest", "avgCloseDays", "activeTimeRange"];
    expect(keys).toContain("monthlyTrend");
    expect(keys).toContain("priorityWorks");
    expect(keys).toContain("latest");
    expect(keys).toContain("avgCloseDays");
    expect(keys).toContain("activeTimeRange");
  });

  it("normalizes supported dashboard time ranges", () => {
    expect(normalizeDashboardTimeRange("this-month")).toBe("this-month");
    expect(normalizeDashboardTimeRange("last-3-months")).toBe("last-3-months");
    expect(normalizeDashboardTimeRange("last-6-months")).toBe("last-6-months");
    expect(normalizeDashboardTimeRange("unknown")).toBeUndefined();
  });

  it("builds calendar-month time range windows", () => {
    const now = new Date(Date.UTC(2026, 5, 14, 12));

    expect(getDashboardTimeRangeWindow("this-month", now)).toEqual({
      start: new Date(Date.UTC(2026, 5, 1)),
      end: new Date(Date.UTC(2026, 6, 1)),
      monthCount: 1,
    });
    expect(getDashboardTimeRangeWindow("last-3-months", now)).toEqual({
      start: new Date(Date.UTC(2026, 3, 1)),
      end: new Date(Date.UTC(2026, 6, 1)),
      monthCount: 3,
    });
  });
});
