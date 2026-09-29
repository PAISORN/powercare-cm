import { describe, expect, it } from "vitest";
import { WorkStatus } from "../cm-work/cm-work-types";
import {
  buildCmDashboardPageModel,
  resolveCmDashboardFilters,
} from "./dashboard-page-model";

describe("CM dashboard page model", () => {
  it("keeps invalid date input from breaking the page", () => {
    const filters = resolveCmDashboardFilters({
      category: "mechanical",
      mode: "day",
      date: "invalid",
    });

    expect(filters.activeCategoryFilter).toBe("mechanical");
    expect(filters.hasExplicitDateFilter).toBe(true);
    expect(filters.activeDateFilter).toBeUndefined();
  });

  it("builds KPI totals and limits the visible trend to six months", () => {
    const monthlyTrend = Array.from({ length: 8 }, (_, index) => ({
      key: String(index),
      label: String(index),
      total: index,
      statusCounts: {},
    }));
    const model = buildCmDashboardPageModel({
      summary: {
        byStatus: [
          { status: WorkStatus.NEW, count: 2 },
          { status: WorkStatus.IN_PROGRESS, count: 3 },
          { status: WorkStatus.CLOSED, count: 4 },
        ],
        byCategory: [],
        byZone: [],
        monthlyTrend,
        latestWorkActivities: [],
        latestStoreIssues: [],
        activeCategory: null,
      } as never,
      unreadSummary: { total: 0 } as never,
    });

    expect(model.statusTotal).toBe(9);
    expect(model.newCount).toBe(2);
    expect(model.inProcessCount).toBe(3);
    expect(model.closedCount).toBe(4);
    expect(model.recentMonthlyTrend.map((row) => row.key)).toEqual([
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
  });
});
