import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const findMany = vi.fn();
const annualPlanFindMany = vi.fn();
const annualScheduleFindMany = vi.fn();
const assetGroupBy = vi.fn();
const pmAnnualWorkSourceFindMany = vi.fn();
vi.mock("../../lib/db", () => ({
  db: {
    pmPlan: { findMany },
    pmAnnualPlan: { findMany: annualPlanFindMany },
    pmAnnualSchedule: { findMany: annualScheduleFindMany },
    asset: { groupBy: assetGroupBy },
    pmAnnualWorkSource: { findMany: pmAnnualWorkSourceFindMany },
  },
}));

describe("PM calendar query", () => {
  beforeEach(() => vi.clearAllMocks());
  it("always creates an accessible 42-day Sunday-first grid without local timezone keys", async () => {
    const { pmMonthGrid } = await import("./pm-calendar-query");
    const grid = pmMonthGrid("2026-08-01");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-07-26");
    expect(grid[41]).toBe("2026-09-05");
  });
  it("keeps calendar keys stable at the UTC/Bangkok day boundary", async () => {
    const { pmMonthGrid } = await import("./pm-calendar-query");
    expect(pmMonthGrid("2026-01-01").slice(0, 2)).toEqual([
      "2025-12-28",
      "2025-12-29",
    ]);
    expect(pmMonthGrid("2026-01-01")).toHaveLength(42);
  });
  it("moves selected days across month boundaries without timezone drift", async () => {
    const { addCalendarDays } = await import("./pm-calendar-query");
    expect(addCalendarDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("rejects impossible dates and months instead of normalizing them", async () => {
    const { isoDateAtUtcNoon, monthStart, pmMonthGrid } = await import(
      "./pm-calendar-query"
    );
    expect(() => isoDateAtUtcNoon("2026-02-30")).toThrow("valid calendar date");
    expect(() => monthStart("2026-13")).toThrow("valid calendar month");
    expect(() => pmMonthGrid("not-a-month")).toThrow("valid calendar month");
  });
  it("queries the full displayed range inside authorized scope", async () => {
    findMany.mockResolvedValue([]);
    const { listPmCalendarPlans } = await import("./pm-calendar-query");
    await listPmCalendarPlans(
      {
        id: "a",
        role: RoleName.SITE_ADMIN,
        organizationId: "org",
        plantId: "site",
      },
      { organizationId: "org", plantId: "site" },
      "2026-08-01",
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org",
          plantId: "site",
          plannedDateKey: { gte: "2026-07-26", lte: "2026-09-05" },
        }),
      }),
    );
  });
  it("shows applied Annual schedules before release with Main Asset counts", async () => {
    annualPlanFindMany.mockResolvedValue([{ id: "annual", status: "DRAFT" }]);
    annualScheduleFindMany.mockResolvedValue([
      {
        id: "s1",
        planId: "annual",
        scheduleDateKey: "2026-08-15",
        status: "SCHEDULED",
        assetSystemId: "sys",
        zoneId: null,
        assetSystem: { nameTh: "Boiler" },
        zone: null,
        releaseSchedules: [],
      },
      {
        id: "s2",
        planId: "annual",
        scheduleDateKey: "2026-08-15",
        status: "SCHEDULED",
        assetSystemId: null,
        zoneId: "zone",
        assetSystem: null,
        zone: { name: "Water Treatment" },
        releaseSchedules: [],
      },
    ]);
    assetGroupBy.mockResolvedValueOnce([
      { systemId: "sys", _count: { _all: 3 } },
    ]);
    assetGroupBy.mockResolvedValueOnce([
      { zoneId: "zone", _count: { _all: 2 } },
    ]);
    const { listAnnualPmCalendarEntries } = await import("./pm-calendar-query");
    const rows = await listAnnualPmCalendarEntries(
      {
        id: "a",
        role: RoleName.SITE_ADMIN,
        organizationId: "org",
        plantId: "site",
      },
      { organizationId: "org", plantId: "site" },
      "2026-08-01",
    );
    expect(
      rows.map((row) => [row.targetName, row.mainAssetCount, row.planStatus]),
    ).toEqual([
      ["Boiler", 3, "DRAFT"],
      ["Water Treatment", 2, "DRAFT"],
    ]);
    expect(annualScheduleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planId: { in: ["annual"] },
          scheduleDateKey: { gte: "2026-07-26", lte: "2026-09-05" },
          slotKey: { not: null },
          status: { in: ["SCHEDULED", "RELEASED"] },
        }),
      }),
    );
    expect(assetGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          plantId: "site",
          registrationStatus: "ACTIVE",
          assetLevel: "MAIN_ASSET",
        }),
      }),
    );
  });

  it("maps released PM Work progress and assignees back to their Annual schedule", async () => {
    annualPlanFindMany.mockResolvedValue([{ id: "annual", status: "ACTIVE" }]);
    annualScheduleFindMany.mockResolvedValue([
      {
        id: "s1",
        planId: "annual",
        scheduleDateKey: "2026-08-15",
        status: "RELEASED",
        assetSystemId: "sys",
        zoneId: null,
        assetSystem: { nameTh: "Boiler" },
        zone: null,
        releaseSchedules: [{ batch: { pmPlanId: "pm-plan" } }],
      },
    ]);
    assetGroupBy.mockResolvedValueOnce([
      { systemId: "sys", _count: { _all: 3 } },
    ]);
    pmAnnualWorkSourceFindMany.mockResolvedValue([
      {
        scheduleId: "s1",
        pmWork: {
          status: "COMPLETED",
          assignees: [
            {
              user: {
                id: "tech",
                fullName: "Somchai Tech",
                profilePhoto: {
                  updatedAt: new Date("2026-08-15T00:00:00.000Z"),
                },
              },
            },
          ],
        },
      },
      {
        scheduleId: "s1",
        pmWork: {
          status: "PLANNED",
          assignees: [
            {
              user: {
                id: "tech",
                fullName: "Somchai Tech",
                profilePhoto: {
                  updatedAt: new Date("2026-08-15T00:00:00.000Z"),
                },
              },
            },
          ],
        },
      },
    ]);

    const { listAnnualPmCalendarEntries } = await import("./pm-calendar-query");
    const rows = await listAnnualPmCalendarEntries(
      {
        id: "a",
        role: RoleName.SITE_ADMIN,
        organizationId: "org",
        plantId: "site",
      },
      { organizationId: "org", plantId: "site" },
      "2026-08-01",
    );

    expect(rows[0]?.assignees).toEqual([
      {
        id: "tech",
        fullName: "Somchai Tech",
        hasPhoto: true,
        photoVersion: new Date("2026-08-15T00:00:00.000Z").getTime(),
      },
    ]);
    expect(rows[0]?.workTotal).toBe(2);
    expect(rows[0]?.workCompleted).toBe(1);
    expect(pmAnnualWorkSourceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scheduleId: { in: ["s1"] } },
      }),
    );
  });

  it("rejects cross-Site calendar reads", async () => {
    const { listPmCalendarPlans } = await import("./pm-calendar-query");
    await expect(
      listPmCalendarPlans(
        {
          id: "a",
          role: RoleName.SITE_ADMIN,
          organizationId: "org",
          plantId: "site",
        },
        { organizationId: "org", plantId: "other" },
        "2026-08-01",
      ),
    ).rejects.toThrow("outside your Site");
  });
});
