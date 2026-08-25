import { describe, expect, it } from "vitest";
import { parsePmWorkFilter, serializePmWorkFilter } from "./pm-filter";

describe("PM work URL filter", () => {
  it("round-trips every supported filter", () => {
    const input = new URLSearchParams("startDate=2026-08-01&endDate=2026-08-31&groupId=g1&assetId=a1&assigneeId=u1&lifecycle=COMPLETED&overdue=1&result=ABNORMAL");
    const parsed = parsePmWorkFilter(input, new Date("2026-08-15T16:59:59.000Z"));
    expect(parsed.todayDateKey).toBe("2026-08-15");
    expect(parsePmWorkFilter(new URLSearchParams(serializePmWorkFilter(parsed)), new Date("2026-08-15T16:59:59.000Z"))).toEqual(parsed);
  });

  it("drops invalid dates and enum values and uses Bangkok date", () => {
    const parsed = parsePmWorkFilter(new URLSearchParams("startDate=2026-02-30&endDate=no&lifecycle=NEW&result=BAD"), new Date("2026-08-15T17:00:00.000Z"));
    expect(parsed).toMatchObject({ lifecycle: undefined, result: undefined, todayDateKey: "2026-08-16" });
    expect(parsed).not.toHaveProperty("startDate"); expect(parsed).not.toHaveProperty("endDate");
  });
});
