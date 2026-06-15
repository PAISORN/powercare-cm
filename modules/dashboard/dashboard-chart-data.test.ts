import { describe, expect, it } from "vitest";
import { buildMonthlyTrend, toChartRows } from "./dashboard-chart-data";
import { WorkStatus } from "../cm-work/cm-work-types";

describe("dashboard chart data", () => {
  it("creates month buckets ending at the selected month", () => {
    const works = [
      { createdAt: new Date("2026-04-12T03:00:00.000Z"), status: WorkStatus.CLOSED },
      { createdAt: new Date("2026-06-01T03:00:00.000Z"), status: WorkStatus.NEW },
      { createdAt: new Date("2026-06-20T03:00:00.000Z"), status: WorkStatus.IN_PROGRESS },
    ];

    const trend = buildMonthlyTrend(works, new Date("2026-06-08T00:00:00.000Z"), 3);

    expect(trend.map(({ key, label, total, open, pending }) => ({ key, label, total, open, pending }))).toEqual([
      { key: "2026-04", label: "Apr 2026", total: 1, open: 0, pending: 0 },
      { key: "2026-05", label: "May 2026", total: 0, open: 0, pending: 0 },
      { key: "2026-06", label: "Jun 2026", total: 2, open: 1, pending: 1 },
    ]);
    expect(trend[2].statusCounts[WorkStatus.NEW]).toBe(1);
    expect(trend[2].statusCounts[WorkStatus.IN_PROGRESS]).toBe(1);
  });

  it("classifies waiting-to-claim work as open and active work as pending", () => {
    const trend = buildMonthlyTrend(
      [
        { createdAt: new Date("2026-06-01T03:00:00.000Z"), status: WorkStatus.WAITING_TO_CLAIM },
        { createdAt: new Date("2026-06-02T03:00:00.000Z"), status: WorkStatus.CLAIMED },
        { createdAt: new Date("2026-06-03T03:00:00.000Z"), status: WorkStatus.WAITING_TO_CLOSE },
        { createdAt: new Date("2026-06-04T03:00:00.000Z"), status: WorkStatus.CANCELED },
      ],
      new Date("2026-06-08T00:00:00.000Z"),
      1,
    );

    const { statusCounts: _statusCounts, ...firstMonth } = trend[0];
    expect(firstMonth).toEqual({
      key: "2026-06",
      label: "Jun 2026",
      total: 4,
      open: 1,
      pending: 2,
    });
    expect(trend[0].statusCounts[WorkStatus.WAITING_TO_CLAIM]).toBe(1);
    expect(trend[0].statusCounts[WorkStatus.CLAIMED]).toBe(1);
    expect(trend[0].statusCounts[WorkStatus.WAITING_TO_CLOSE]).toBe(1);
    expect(trend[0].statusCounts[WorkStatus.CANCELED]).toBe(1);
  });

  it("sizes chart rows by the largest value while preserving zero rows", () => {
    const rows = toChartRows([
      { label: "Electrical", count: 2 },
      { label: "Mechanical", count: 4 },
      { label: "Other", count: 0 },
    ]);

    expect(rows).toEqual([
      { label: "Electrical", count: 2, percentage: 50 },
      { label: "Mechanical", count: 4, percentage: 100 },
      { label: "Other", count: 0, percentage: 0 },
    ]);
  });
});
