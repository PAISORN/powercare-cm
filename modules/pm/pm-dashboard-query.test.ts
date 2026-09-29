import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pmWorkFindMany: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  db: {
    pmWork: { findMany: mocks.pmWorkFindMany },
  },
}));

import { getPmDashboardSummary } from "./pm-dashboard-query";
import { PmWorkStatus } from "./pm-types";

describe("PM dashboard query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("summarizes the selected site month and the next seven days", async () => {
    mocks.pmWorkFindMany
      .mockResolvedValueOnce([
        monthlyWork("work-1", "2026-09-01", PmWorkStatus.COMPLETED, "user-a", "สมชาย"),
        monthlyWork("work-2", "2026-09-20", PmWorkStatus.IN_PROGRESS, "user-b", "สุดา"),
        monthlyWork("work-3", "2026-09-29", PmWorkStatus.PLANNED),
        monthlyWork("work-4", "2026-09-30", PmWorkStatus.COMPLETED, "user-a", "สมชาย"),
      ])
      .mockResolvedValueOnce([
        {
          id: "work-2",
          number: "PM-002",
          status: PmWorkStatus.IN_PROGRESS,
          assetCodeSnapshot: "P-101",
          assetNameSnapshot: "Pump 101",
          pmPlan: { plannedDateKey: "2026-09-20" },
          assignees: [{ user: { fullName: "สุดา" } }],
        },
      ])
      .mockResolvedValueOnce([
        { id: "work-3", status: PmWorkStatus.PLANNED, pmPlan: { plannedDateKey: "2026-09-29" } },
        { id: "work-4", status: PmWorkStatus.COMPLETED, pmPlan: { plannedDateKey: "2026-09-30" } },
      ])
      .mockResolvedValueOnce([
        { status: PmWorkStatus.COMPLETED, pmPlan: { plannedDateKey: "2026-08-12" } },
        { status: PmWorkStatus.PLANNED, pmPlan: { plannedDateKey: "2026-08-20" } },
        { status: PmWorkStatus.COMPLETED, pmPlan: { plannedDateKey: "2026-09-01" } },
        { status: PmWorkStatus.IN_PROGRESS, pmPlan: { plannedDateKey: "2026-09-20" } },
      ])
      .mockResolvedValueOnce([
        {
          id: "work-1",
          number: "PM-001",
          result: "ABNORMAL",
          resultNote: "พบเสียงดังผิดปกติ",
          assetCodeSnapshot: "P-100",
          assetNameSnapshot: "Pump 100",
          completedAt: new Date("2026-09-28T03:00:00Z"),
          completedBy: { fullName: "สมชาย" },
        },
      ])
      .mockResolvedValueOnce([
        annualWork("2026-01-10", PmWorkStatus.COMPLETED),
        annualWork("2026-09-01", PmWorkStatus.COMPLETED),
        annualWork("2026-09-20", PmWorkStatus.IN_PROGRESS),
        annualWork("2026-09-29", PmWorkStatus.PLANNED),
        annualWork("2026-09-30", PmWorkStatus.CANCELED),
        annualWork("2026-09-30", PmWorkStatus.CANCELED),
      ]);

    const result = await getPmDashboardSummary(
      { organizationId: "org-a", plantId: "plant-a" },
      "2026-09-29",
    );

    expect(result.monthStart).toBe("2026-09-01");
    expect(result.monthEnd).toBe("2026-09-30");
    expect(result.nextWeekEnd).toBe("2026-10-05");
    expect(result.metrics).toEqual({
      today: 1,
      inProgress: 1,
      overdue: 1,
      completed: 2,
      planned: 1,
      total: 4,
      completionPercent: 50,
      annualTotal: 6,
      annualCompleted: 2,
      annualCompletionPercent: 33,
      monthTotal: 5,
      monthCompleted: 1,
      monthCompletionPercent: 20,
      canceledDays: 1,
      canceledWorks: 2,
      cancellationPercent: 33,
      todayTotal: 1,
      todayCompleted: 0,
      todayCompletionPercent: 0,
    });
    expect(result.attentionWorks[0]).toMatchObject({ id: "work-2", overdue: true });
    expect(result.upcomingDays).toHaveLength(7);
    expect(result.upcomingDays[0]).toMatchObject({ dateKey: "2026-09-29", total: 1 });
    expect(result.upcomingDays[1]).toMatchObject({
      dateKey: "2026-09-30",
      total: 1,
      completed: 1,
    });
    expect(result.monthlyTrend).toHaveLength(6);
    expect(result.monthlyTrend.at(-2)).toMatchObject({
      key: "2026-08",
      total: 2,
      completed: 1,
      overdue: 1,
      completionPercent: 50,
    });
    expect(result.monthlyTrend.at(-1)).toMatchObject({
      key: "2026-09",
      total: 2,
      completed: 1,
      inProgress: 1,
      completionPercent: 50,
    });
    expect(result.pmComments).toEqual([
      expect.objectContaining({
        id: "work-1",
        result: "ABNORMAL",
        resultNote: "พบเสียงดังผิดปกติ",
      }),
    ]);
    expect(result.workload).toEqual([
      {
        id: "user-b",
        name: "สุดา",
        total: 1,
        completed: 0,
        inProgress: 1,
        overdue: 1,
      },
      {
        id: "user-a",
        name: "สมชาย",
        total: 2,
        completed: 2,
        inProgress: 0,
        overdue: 0,
      },
      {
        id: "unassigned",
        name: "ยังไม่มอบหมาย",
        total: 1,
        completed: 0,
        inProgress: 0,
        overdue: 0,
      },
    ]);
  });

  it("applies organization and plant scope to every dashboard query", async () => {
    mocks.pmWorkFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await getPmDashboardSummary(
      { organizationId: "org-a", plantId: "plant-a" },
      "2026-09-29",
    );

    expect(mocks.pmWorkFindMany).toHaveBeenCalledTimes(6);
    for (const [query] of mocks.pmWorkFindMany.mock.calls) {
      expect(query.where).toMatchObject({
        plantId: "plant-a",
        pmPlan: { organizationId: "org-a", plantId: "plant-a" },
      });
    }
  });
});

function monthlyWork(
  id: string,
  plannedDateKey: string,
  status: PmWorkStatus,
  userId?: string,
  fullName?: string,
) {
  return {
    id,
    status,
    pmPlan: { plannedDateKey },
    assignees:
      userId && fullName
        ? [{ role: "OWNER", user: { id: userId, fullName } }]
        : [],
  };
}

function annualWork(plannedDateKey: string, status: PmWorkStatus) {
  return { status, pmPlan: { plannedDateKey } };
}
