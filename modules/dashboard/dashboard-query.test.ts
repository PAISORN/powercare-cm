import { describe, expect, it } from "vitest";
import {
  composePriorityQueue,
  getDashboardTimeRangeWindow,
  normalizeDashboardTimeRange,
  resolveDashboardSectionWindows,
} from "./dashboard-query";

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

  it("uses current Bangkok year for summary and latest six months for trend by default", () => {
    const now = new Date("2026-06-21T03:00:00.000Z");
    const windows = resolveDashboardSectionWindows(undefined, now);

    expect(windows.summary).toEqual({
      start: new Date("2025-12-31T17:00:00.000Z"),
      endExclusive: now,
    });
    expect(windows.trend).toEqual({
      start: new Date("2025-12-31T17:00:00.000Z"),
      endExclusive: now,
      monthCount: 6,
    });
    expect(windows.priority).toBeNull();
  });

  it("applies an explicit range to every dashboard section", () => {
    const dateFilter = {
      mode: "range" as const,
      start: new Date("2026-01-31T17:00:00.000Z"),
      endExclusive: new Date("2026-02-28T17:00:00.000Z"),
      bucket: "day" as const,
      includeTerminal: false,
    };
    const windows = resolveDashboardSectionWindows(dateFilter, new Date("2026-06-21T03:00:00.000Z"));

    expect(windows.summary).toEqual({ start: dateFilter.start, endExclusive: dateFilter.endExclusive });
    expect(windows.trend).toEqual({ start: dateFilter.start, endExclusive: dateFilter.endExclusive, monthCount: 1 });
    expect(windows.priority).toEqual({ start: dateFilter.start, endExclusive: dateFilter.endExclusive });
  });

  it("removes time restrictions from every section for an explicit all-time filter", () => {
    const windows = resolveDashboardSectionWindows(
      { mode: "all", bucket: "month", includeTerminal: false },
      new Date("2026-06-21T03:00:00.000Z"),
    );

    expect(windows.summary).toBeNull();
    expect(windows.trend).toEqual({ start: undefined, endExclusive: undefined, monthCount: undefined });
    expect(windows.priority).toBeNull();
  });

  it("composes no more than five priority works in critical, urgent, then status order", () => {
    const result = composePriorityQueue({
      critical: [{ id: "critical-old" }, { id: "critical-new" }],
      urgent: [{ id: "urgent-old" }, { id: "urgent-new" }],
      statusPriority: [{ id: "waiting-old" }, { id: "waiting-new" }],
    });

    expect(result.map((row) => row.id)).toEqual([
      "critical-old",
      "critical-new",
      "urgent-old",
      "urgent-new",
      "waiting-old",
    ]);
    expect(result).toHaveLength(5);
  });
});
