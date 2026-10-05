import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const tx = {
  plant: { findFirstOrThrow: vi.fn() },
  assetSystem: { findFirst: vi.fn() },
  zone: { findFirst: vi.fn() },
  pmAnnualPlan: {
    create: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pmAnnualSchedule: {
    upsert: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  pmAnnualWeeklyPattern: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  pmAnnualMonthlyWeek: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  pmAnnualMonthlyPattern: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  pmAnnualDayNote: { deleteMany: vi.fn(), upsert: vi.fn() },
  auditEvent: { create: vi.fn() },
};
const transaction = vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx));
const db = {
  $transaction: transaction,
  pmAnnualPlan: { findMany: vi.fn(), findFirstOrThrow: vi.fn() },
  asset: { groupBy: vi.fn() },
  assetSystem: { findMany: vi.fn() },
  zone: { findMany: vi.fn() },
};
vi.mock("../../lib/db", () => ({ db }));
const engineer = {
  id: "eng",
  role: RoleName.ENGINEER,
  organizationId: "org",
  plantId: "site",
};
const scope = { organizationId: "org", plantId: "site" };
const draft = {
  id: "annual",
  ...scope,
  name: "Annual 2026",
  year: 2026,
  pmBy: "SYSTEM",
  scheduleMode: "WEEKLY_PATTERN",
  patternCycleWeeks: 1,
  rotationAnchorDateKey: null,
  monthlyWeek5Rule: "NO_PM",
  monthlyPatternVersion: 0,
  monthlyGeneratedVersion: 0,
  status: "DRAFT",
};

describe("Annual PM service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (fn: (client: typeof tx) => unknown) =>
      fn(tx),
    );
    tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site" });
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue(draft);
    tx.auditEvent.create.mockResolvedValue({});
    tx.assetSystem.findFirst.mockResolvedValue({ id: "sys" });
    tx.pmAnnualSchedule.findMany.mockResolvedValue([]);
    tx.pmAnnualSchedule.findUnique.mockResolvedValue(null);
    tx.pmAnnualSchedule.deleteMany.mockResolvedValue({ count: 0 });
    tx.pmAnnualSchedule.create.mockImplementation(async ({ data }) => ({
      id: "schedule",
      ...data,
    }));
    tx.pmAnnualPlan.update.mockImplementation(async ({ data }) => ({
      ...draft,
      ...data,
      monthlyPatternVersion: data.monthlyPatternVersion?.increment
        ? draft.monthlyPatternVersion + data.monthlyPatternVersion.increment
        : (data.monthlyPatternVersion ?? draft.monthlyPatternVersion),
    }));
  });

  it("counts only active Main Assets in the selected Site for each System or Zone", async () => {
    const { countAnnualPmMainAssets } = await import("./pm-annual-service");
    db.asset.groupBy.mockResolvedValueOnce([
      { systemId: "sys", _count: { _all: 3 } },
    ]);
    expect(
      await countAnnualPmMainAssets(engineer, {
        ...scope,
        pmBy: "SYSTEM",
        targetIds: ["sys", "empty"],
      }),
    ).toEqual({ sys: 3 });
    expect(db.asset.groupBy).toHaveBeenCalledWith({
      by: ["systemId"],
      where: {
        plantId: "site",
        registrationStatus: "ACTIVE",
        assetLevel: "MAIN_ASSET",
        systemId: { in: ["sys", "empty"] },
      },
      _count: { _all: true },
    });

    db.asset.groupBy.mockResolvedValueOnce([
      { zoneId: "zone", _count: { _all: 2 } },
    ]);
    expect(
      await countAnnualPmMainAssets(engineer, {
        ...scope,
        pmBy: "ZONE",
        targetIds: ["zone"],
      }),
    ).toEqual({ zone: 2 });
    expect(db.asset.groupBy).toHaveBeenLastCalledWith({
      by: ["zoneId"],
      where: {
        plantId: "site",
        registrationStatus: "ACTIVE",
        assetLevel: "MAIN_ASSET",
        zoneId: { in: ["zone"] },
      },
      _count: { _all: true },
    });
  });

  it("lets Engineer create a Draft and does not create PM Work", async () => {
    tx.pmAnnualPlan.create.mockResolvedValue(draft);
    const { createAnnualPmPlan } = await import("./pm-annual-service");
    await createAnnualPmPlan(engineer, {
      ...scope,
      name: "Annual 2026",
      year: 2026,
      pmBy: "SYSTEM",
      scheduleMode: "WEEKLY_PATTERN",
    });
    expect(tx.pmAnnualPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: "eng",
        pmBy: "SYSTEM",
        scheduleMode: "WEEKLY_PATTERN",
      }),
    });
    expect((tx as Record<string, unknown>).pmWork).toBeUndefined();
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(tx.auditEvent.create.mock.calls[0][0].data).toEqual({
      actorId: "eng",
      ...scope,
      entityType: "PmAnnualPlan",
      entityId: "annual",
      action: "ANNUAL_PM_PLAN_CREATED",
      beforeJson: "null",
      afterJson: JSON.stringify(draft),
    });
  });

  it("loads a Draft by ID and Site before deleting it", async () => {
    const { deleteDraftAnnualPmPlan } = await import("./pm-annual-service");
    await deleteDraftAnnualPmPlan(engineer, { ...scope, planId: "annual" });
    expect(tx.pmAnnualPlan.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: "annual", ...scope },
    });
    expect(tx.pmAnnualPlan.delete).toHaveBeenCalledWith({
      where: { id: "annual" },
    });
  });
  it("rejects Technician management before any transaction", async () => {
    const { createAnnualPmPlan } = await import("./pm-annual-service");
    await expect(
      createAnnualPmPlan(
        { ...engineer, id: "tech", role: RoleName.TECHNICIAN },
        {
          ...scope,
          name: "Annual",
          year: 2026,
          pmBy: "SYSTEM",
          scheduleMode: "MANUAL",
        },
      ),
    ).rejects.toThrow("cannot manage");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("preserves the original schedule and creates a linked No-PM exception", async () => {
    const original = {
      id: "s1",
      planId: "annual",
      plantId: "site",
      scheduleDateKey: "2026-09-01",
      assetSystemId: "sys",
      zoneId: null,
      status: "SCHEDULED",
      releasedAt: null,
      slotKey: "annual:2026-09-01:SYSTEM:sys",
    };
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      status: "ACTIVE",
    });
    tx.pmAnnualSchedule.findFirstOrThrow.mockResolvedValue(original);
    const { cancelAnnualPmSchedule } = await import("./pm-annual-service");
    await cancelAnnualPmSchedule(engineer, {
      ...scope,
      planId: "annual",
      scheduleId: "s1",
      reason: "Shutdown",
    });
    expect(tx.pmAnnualSchedule.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({
        status: "CANCELED",
        slotKey: null,
        reason: "Shutdown",
      }),
    });
    expect(tx.pmAnnualSchedule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "OVERRIDE",
        overrideAction: "NO_PM",
        originalScheduleId: "s1",
        slotKey: original.slotKey,
      }),
    });
  });

  it("stores Week A and B separately with an explicit Monday anchor", async () => {
    const { saveAnnualWeeklyPattern } = await import("./pm-annual-service");
    await saveAnnualWeeklyPattern(engineer, {
      ...scope,
      planId: "annual",
      cycleWeeks: 2,
      anchorDateKey: "2026-12-28",
      entries: [
        { weekIndex: 1, dayOfWeek: 3, assetSystemId: "sys-a" },
        { weekIndex: 2, dayOfWeek: 3, assetSystemId: "sys-b" },
      ],
    });
    expect(tx.pmAnnualPlan.update).toHaveBeenCalledWith({
      where: { id: "annual" },
      data: { patternCycleWeeks: 2, rotationAnchorDateKey: "2026-12-28" },
    });
    expect(tx.pmAnnualWeeklyPattern.create).toHaveBeenCalledTimes(2);
    expect(
      tx.pmAnnualWeeklyPattern.create.mock.calls.map(
        (call) => call[0].data.patternKey,
      ),
    ).toEqual(["annual:3:SYSTEM:sys-a", "annual:3:2:SYSTEM:sys-b"]);
    expect(
      tx.pmAnnualWeeklyPattern.create.mock.calls.map(
        (call) => call[0].data.weekIndex,
      ),
    ).toEqual([1, 2]);
  });

  it("rejects a non-Monday rotation anchor before changing saved patterns", async () => {
    const { saveAnnualWeeklyPattern } = await import("./pm-annual-service");
    await expect(
      saveAnnualWeeklyPattern(engineer, {
        ...scope,
        planId: "annual",
        cycleWeeks: 2,
        anchorDateKey: "2027-01-01",
        entries: [],
      }),
    ).rejects.toThrow(/Monday/);
    expect(tx.pmAnnualWeeklyPattern.deleteMany).not.toHaveBeenCalled();
  });

  it("applies alternate targets to consecutive Wednesdays", async () => {
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      year: 2027,
      patternCycleWeeks: 2,
      rotationAnchorDateKey: "2027-01-04",
    });
    tx.pmAnnualWeeklyPattern.findMany.mockResolvedValue([
      {
        id: "m",
        dayOfWeek: 1,
        weekIndex: 1,
        assetSystemId: "sys-monday",
        zoneId: null,
      },
      {
        id: "a",
        dayOfWeek: 3,
        weekIndex: 1,
        assetSystemId: "sys-a",
        zoneId: null,
      },
      {
        id: "b",
        dayOfWeek: 3,
        weekIndex: 2,
        assetSystemId: "sys-b",
        zoneId: null,
      },
    ]);
    const { applyAnnualWeeklyPattern } = await import("./pm-annual-service");
    await applyAnnualWeeklyPattern(engineer, { ...scope, planId: "annual" });
    const created = tx.pmAnnualSchedule.create.mock.calls.map(
      (call) => call[0].data,
    );
    expect(
      created.find((row) => row.scheduleDateKey === "2027-01-06")
        ?.assetSystemId,
    ).toBe("sys-a");
    expect(
      created.find((row) => row.scheduleDateKey === "2027-01-13")
        ?.assetSystemId,
    ).toBe("sys-b");
    expect(
      created.find((row) => row.scheduleDateKey === "2027-01-04")
        ?.assetSystemId,
    ).toBe("sys-monday");
    expect(
      created.find((row) => row.scheduleDateKey === "2027-01-11")
        ?.assetSystemId,
    ).toBe("sys-monday");
    expect(
      created.filter((row) => row.scheduleDateKey === "2027-01-06"),
    ).toHaveLength(1);
  });
  it("reconciles only unreleased Pattern schedules and keeps exceptions outside the delete query", async () => {
    tx.pmAnnualWeeklyPattern.findMany.mockResolvedValue([
      {
        id: "p1",
        planId: "annual",
        plantId: "site",
        dayOfWeek: 1,
        weekIndex: 1,
        assetSystemId: "sys",
        zoneId: null,
      },
    ]);
    tx.pmAnnualSchedule.findMany.mockResolvedValue([
      { id: "obsolete", slotKey: "obsolete" },
    ]);
    const { applyAnnualWeeklyPattern } = await import("./pm-annual-service");
    const result = await applyAnnualWeeklyPattern(engineer, {
      ...scope,
      planId: "annual",
    });
    expect(tx.pmAnnualSchedule.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        source: "PATTERN",
        status: "SCHEDULED",
        releasedAt: null,
        originalScheduleId: null,
      }),
      select: { id: true, slotKey: true },
    });
    expect(tx.pmAnnualSchedule.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["obsolete"] } },
    });
    expect(result.removed).toBe(1);
    expect(result.added).toBeGreaterThan(0);
  });

  it("saves a complete Monthly Pattern and marks its generated calendar stale", async () => {
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      scheduleMode: "MONTHLY_PATTERN",
    });
    const { saveAnnualMonthlyPattern } = await import("./pm-annual-service");
    const result = await saveAnnualMonthlyPattern(engineer, {
      ...scope,
      planId: "annual",
      week5Rule: "REPEAT_WEEK_1",
      weeks: [
        { weekNumber: 1, mode: "ASSIGNMENTS" },
        { weekNumber: 2, mode: "NO_PM" },
        { weekNumber: 3, mode: "NO_PM" },
        { weekNumber: 4, mode: "NO_PM" },
      ],
      entries: [
        { weekNumber: 1, dayOfWeek: 1, displayOrder: 0, assetSystemId: "sys" },
      ],
    });
    expect(tx.pmAnnualMonthlyWeek.create).toHaveBeenCalledTimes(4);
    expect(tx.pmAnnualMonthlyPattern.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        weekNumber: 1,
        dayOfWeek: 1,
        patternKey: "annual:1:1:SYSTEM:sys",
      }),
    });
    expect(tx.pmAnnualPlan.update).toHaveBeenCalledWith({
      where: { id: "annual" },
      data: expect.objectContaining({
        monthlyWeek5Rule: "REPEAT_WEEK_1",
        monthlyPatternVersion: { increment: 1 },
        updatedById: "eng",
      }),
    });
    expect(result).toEqual({ entries: 1, version: 1 });
  });

  it("blocks Monthly Pattern generation while a Week is Not Configured", async () => {
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      scheduleMode: "MONTHLY_PATTERN",
      year: 2027,
      monthlyPatternVersion: 1,
    });
    tx.pmAnnualMonthlyWeek.findMany.mockResolvedValue([
      { weekNumber: 1, mode: "ASSIGNMENTS" },
      { weekNumber: 2, mode: "ASSIGNMENTS" },
      { weekNumber: 3, mode: "NO_PM" },
      { weekNumber: 4, mode: "NO_PM" },
    ]);
    tx.pmAnnualMonthlyPattern.findMany.mockResolvedValue([
      {
        weekNumber: 1,
        dayOfWeek: 1,
        displayOrder: 0,
        assetSystemId: "sys",
        zoneId: null,
      },
    ]);
    const { previewAnnualMonthlyPattern } = await import("./pm-annual-service");
    await expect(
      previewAnnualMonthlyPattern(engineer, {
        ...scope,
        planId: "annual",
        effectiveDateKey: "2027-01-01",
      }),
    ).rejects.toThrow("Week 2 is Not Configured");
  });

  it("generates nth weekdays for every month and repeats Week 1 only on a real fifth occurrence", async () => {
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      scheduleMode: "MONTHLY_PATTERN",
      year: 2027,
      monthlyWeek5Rule: "REPEAT_WEEK_1",
      monthlyPatternVersion: 2,
    });
    tx.pmAnnualMonthlyWeek.findMany.mockResolvedValue([
      { weekNumber: 1, mode: "ASSIGNMENTS" },
      { weekNumber: 2, mode: "NO_PM" },
      { weekNumber: 3, mode: "NO_PM" },
      { weekNumber: 4, mode: "NO_PM" },
    ]);
    tx.pmAnnualMonthlyPattern.findMany.mockResolvedValue([
      {
        weekNumber: 1,
        dayOfWeek: 1,
        displayOrder: 0,
        assetSystemId: "sys",
        zoneId: null,
      },
    ]);
    const { applyAnnualMonthlyPattern } = await import("./pm-annual-service");
    const result = await applyAnnualMonthlyPattern(engineer, {
      ...scope,
      planId: "annual",
      effectiveDateKey: "2027-01-01",
    });
    const dates = tx.pmAnnualSchedule.create.mock.calls.map(
      (call) => call[0].data.scheduleDateKey,
    );
    expect(dates).toContain("2027-01-04");
    expect(dates).not.toContain("2027-01-29");
    expect(dates).toContain("2027-03-29");
    expect(result.desired).toBeGreaterThan(12);
    expect(tx.pmAnnualPlan.update).toHaveBeenCalledWith({
      where: { id: "annual" },
      data: expect.objectContaining({
        monthlyGeneratedVersion: 2,
        effectiveDateKey: "2027-01-01",
      }),
    });
  });

  it("blocks activation when the Monthly Pattern calendar is stale", async () => {
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      scheduleMode: "MONTHLY_PATTERN",
      monthlyPatternVersion: 2,
      monthlyGeneratedVersion: 1,
    });
    const { activateAnnualPmPlan } = await import("./pm-annual-service");
    await expect(
      activateAnnualPmPlan(engineer, {
        ...scope,
        planId: "annual",
        effectiveDateKey: "2026-12-01",
      }),
    ).rejects.toThrow("Regeneration Required");
    expect(tx.pmAnnualSchedule.count).not.toHaveBeenCalled();
  });

  it("activates a synchronized Monthly Pattern from its generated effective date", async () => {
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      scheduleMode: "MONTHLY_PATTERN",
      monthlyPatternVersion: 2,
      monthlyGeneratedVersion: 2,
      effectiveDateKey: "2026-10-15",
    });
    tx.pmAnnualSchedule.count.mockResolvedValue(1);
    tx.pmAnnualSchedule.findMany.mockResolvedValue([
      { assetSystem: { active: true }, zone: null },
    ]);
    tx.pmAnnualPlan.findFirst.mockResolvedValue(null);
    const { activateAnnualPmPlan } = await import("./pm-annual-service");
    await activateAnnualPmPlan(engineer, {
      ...scope,
      planId: "annual",
      effectiveDateKey: "2026-11-01",
    });
    expect(tx.pmAnnualPlan.update).toHaveBeenCalledWith({
      where: { id: "annual" },
      data: expect.objectContaining({
        status: "ACTIVE",
        effectiveDateKey: "2026-10-15",
      }),
    });
  });

  it("requires a reason for an Active Monthly custom assignment and records it as ADD", async () => {
    tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({
      ...draft,
      scheduleMode: "MONTHLY_PATTERN",
      status: "ACTIVE",
    });
    const { addAnnualPmSchedule } = await import("./pm-annual-service");
    await expect(
      addAnnualPmSchedule(engineer, {
        ...scope,
        planId: "annual",
        scheduleDateKey: "2026-10-15",
        assetSystemId: "sys",
      }),
    ).rejects.toThrow("reason is required");
    await addAnnualPmSchedule(engineer, {
      ...scope,
      planId: "annual",
      scheduleDateKey: "2026-10-15",
      assetSystemId: "sys",
      reason: "Shutdown recovery",
    });
    expect(tx.pmAnnualSchedule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "OVERRIDE",
        overrideAction: "ADD",
        reason: "Shutdown recovery",
      }),
    });
  });

  it("changes a future target through a linked override and keeps the original", async () => {
    const original = {
      id: "s1",
      planId: "annual",
      plantId: "site",
      scheduleDateKey: "2026-10-01",
      assetSystemId: "sys",
      zoneId: null,
      status: "SCHEDULED",
      releasedAt: null,
      slotKey: "old-slot",
    };
    tx.pmAnnualSchedule.findFirstOrThrow.mockResolvedValue(original);
    tx.assetSystem.findFirst.mockResolvedValue({ id: "sys2" });
    const { changeAnnualPmSchedule } = await import("./pm-annual-service");
    await changeAnnualPmSchedule(engineer, {
      ...scope,
      planId: "annual",
      scheduleId: "s1",
      assetSystemId: "sys2",
      reason: "Change route",
    });
    expect(tx.pmAnnualSchedule.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({ status: "MOVED", slotKey: null }),
    });
    expect(tx.pmAnnualSchedule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetSystemId: "sys2",
        source: "OVERRIDE",
        overrideAction: "CHANGE",
        originalScheduleId: "s1",
      }),
    });
  });

  it("blocks replacing an Active plan when future work was already released", async () => {
    tx.pmAnnualSchedule.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    tx.pmAnnualPlan.findFirst.mockResolvedValue({
      ...draft,
      id: "active",
      status: "ACTIVE",
    });
    const { activateAnnualPmPlan } = await import("./pm-annual-service");
    await expect(
      activateAnnualPmPlan(engineer, {
        ...scope,
        planId: "annual",
        effectiveDateKey: "2026-12-01",
      }),
    ).rejects.toThrow("released work");
    expect(tx.pmAnnualPlan.update).not.toHaveBeenCalled();
  });
  it("requires an explicit confirmed reset and clears Draft children before changing mode", async () => {
    const { resetDraftAnnualPmPlanSettings } =
      await import("./pm-annual-service");
    await expect(
      resetDraftAnnualPmPlanSettings(engineer, {
        ...scope,
        planId: "annual",
        pmBy: "ZONE",
        scheduleMode: "MANUAL",
        confirmedReset: false,
      }),
    ).rejects.toThrow("Confirm reset");
    tx.pmAnnualPlan.update.mockResolvedValue({
      ...draft,
      pmBy: "ZONE",
      scheduleMode: "MANUAL",
    });
    await resetDraftAnnualPmPlanSettings(engineer, {
      ...scope,
      planId: "annual",
      pmBy: "ZONE",
      scheduleMode: "MANUAL",
      confirmedReset: true,
    });
    expect(tx.pmAnnualDayNote.deleteMany).toHaveBeenCalledBefore(
      tx.pmAnnualPlan.update,
    );
    expect(tx.pmAnnualSchedule.deleteMany).toHaveBeenCalledBefore(
      tx.pmAnnualPlan.update,
    );
    expect(tx.pmAnnualWeeklyPattern.deleteMany).toHaveBeenCalledBefore(
      tx.pmAnnualPlan.update,
    );
    expect(tx.pmAnnualMonthlyPattern.deleteMany).toHaveBeenCalledBefore(
      tx.pmAnnualPlan.update,
    );
    expect(tx.pmAnnualMonthlyWeek.deleteMany).toHaveBeenCalledBefore(
      tx.pmAnnualPlan.update,
    );
  });
});
