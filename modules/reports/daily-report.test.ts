import { describe, expect, it } from "vitest";
import { defaultDailyReportRange, parseDailyReportFilter } from "./daily-report";

describe("daily report", () => {
  it("accepts a selected date range and category", () => {
    const filter = parseDailyReportFilter(new URLSearchParams("dailyStartDate=2026-06-01&dailyEndDate=2026-06-28&dailyCategoryId=mechanical"));

    expect(filter.startDate).toBe("2026-06-01");
    expect(filter.endDate).toBe("2026-06-28");
    expect(filter.categoryId).toBe("mechanical");
  });

  it("defaults to the beginning of 2026 through the current Bangkok date", () => {
    expect(defaultDailyReportRange(new Date("2026-06-27T18:00:00.000Z"))).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-06-28",
    });
  });

  it("rejects malformed dates and falls back to the default range", () => {
    const filter = parseDailyReportFilter(new URLSearchParams("dailyStartDate=28/06/2026"), new Date("2026-06-28T03:00:00.000Z"));

    expect(filter.startDate).toBe("2026-01-01");
    expect(filter.endDate).toBe("2026-06-28");
  });
});
