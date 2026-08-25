import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const findMany = vi.fn();
vi.mock("../../lib/db", () => ({ db: { pmPlan: { findMany } } }));

describe("PM calendar query", () => {
  beforeEach(() => vi.clearAllMocks());
  it("always creates an accessible 42-day Monday-first grid without local timezone keys", async () => {
    const { pmMonthGrid } = await import("./pm-calendar-query");
    const grid = pmMonthGrid("2026-08-01");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-07-27");
    expect(grid[41]).toBe("2026-09-06");
  });
  it("keeps calendar keys stable at the UTC/Bangkok day boundary", async () => {
    const { pmMonthGrid } = await import("./pm-calendar-query");
    expect(pmMonthGrid("2026-01-01").slice(0, 2)).toEqual(["2025-12-29", "2025-12-30"]);
    expect(pmMonthGrid("2026-01-01")).toHaveLength(42);
  });
  it("moves selected days across month boundaries without timezone drift", async () => {
    const { addCalendarDays } = await import("./pm-calendar-query");
    expect(addCalendarDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("rejects impossible dates and months instead of normalizing them", async () => {
    const { isoDateAtUtcNoon, monthStart, pmMonthGrid } = await import("./pm-calendar-query");
    expect(() => isoDateAtUtcNoon("2026-02-30")).toThrow("valid calendar date");
    expect(() => monthStart("2026-13")).toThrow("valid calendar month");
    expect(() => pmMonthGrid("not-a-month")).toThrow("valid calendar month");
  });
  it("queries the full displayed range inside authorized scope", async () => {
    findMany.mockResolvedValue([]);
    const { listPmCalendarPlans } = await import("./pm-calendar-query");
    await listPmCalendarPlans({ id: "a", role: RoleName.SITE_ADMIN, organizationId: "org", plantId: "site" }, { organizationId: "org", plantId: "site" }, "2026-08-01");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", plantId: "site", plannedDateKey: { gte: "2026-07-27", lte: "2026-09-06" } }) }));
  });
  it("rejects cross-Site calendar reads", async () => {
    const { listPmCalendarPlans } = await import("./pm-calendar-query");
    await expect(listPmCalendarPlans({ id: "a", role: RoleName.SITE_ADMIN, organizationId: "org", plantId: "site" }, { organizationId: "org", plantId: "other" }, "2026-08-01")).rejects.toThrow("outside your Site");
  });
});
