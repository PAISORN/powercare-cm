import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const tx = {
  plant: { findFirstOrThrow: vi.fn() }, user: { findMany: vi.fn() }, rolePermissionOverride: { findMany: vi.fn() }, asset: { findFirstOrThrow: vi.fn() },
  pmPlan: { findFirstOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  pmWork: { findFirstOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn(), count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  pmWorkAssignee: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() }, auditEvent: { create: vi.fn() },
  userNotification: { create: vi.fn() },
};
const transaction = vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx));
const db = { $transaction: transaction, pmWork: { findFirstOrThrow: vi.fn(), findMany: vi.fn() }, user: { findMany: vi.fn() }, rolePermissionOverride: { findMany: vi.fn() } };
vi.mock("../../lib/db", () => ({ db }));
const scope = { organizationId: "org", plantId: "site" };
const technician = { id: "tech", role: RoleName.TECHNICIAN, ...scope };
const manager = { id: "manager", role: RoleName.SITE_ADMIN, ...scope };

describe("PM work lifecycle service", () => {
  beforeEach(() => {
    vi.clearAllMocks(); transaction.mockImplementation(async fn => fn(tx)); tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site" }); tx.auditEvent.create.mockResolvedValue({}); tx.pmWorkAssignee.count.mockResolvedValue(1); tx.pmWork.updateMany.mockResolvedValue({ count: 1 });
  });
  it("starts only an assigned Planned work through a conditional transition", async () => {
    tx.pmWork.findFirstOrThrow.mockResolvedValue({ id: "work" });
    const { startPmWork } = await import("./pm-work-service"); await startPmWork(technician, { ...scope, workId: "work", now: new Date("2026-08-15T01:00:00Z") });
    expect(tx.pmWork.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PLANNED" }), data: expect.objectContaining({ status: "IN_PROGRESS" }) })); expect(tx.auditEvent.create).toHaveBeenCalledOnce();
  });
  it("writes assignment notifications atomically for assignees and scoped managers", async () => {
    tx.pmWork.findFirstOrThrow.mockResolvedValue({ id: "work", number: "PM-1", status: "PLANNED", plantId: "site", pmPlan: { organizationId: "org", plannedDateKey: "2026-08-15" }, assignees: [] });
    tx.user.findMany.mockResolvedValueOnce([{ id: "tech", role: RoleName.TECHNICIAN, active: true, organizationId: "org", plantId: "site", siteAdminPermissions: [], userPermissionOverrides: [] }]).mockResolvedValueOnce([{ id: "manager", role: RoleName.SITE_ADMIN, organizationId: "org", plantId: "site", siteAdminPermissions: [], userPermissionOverrides: [] }]);
    tx.rolePermissionOverride.findMany.mockResolvedValue([]);
    tx.userNotification.create.mockResolvedValue({});
    const { assignPmWork } = await import("./pm-work-service");
    await assignPmWork(manager, { ...scope, workId: "work", leadUserId: "tech", now: new Date("2026-08-15T03:00:00Z") });
    expect(tx.userNotification.create).toHaveBeenCalledTimes(2);
    expect(tx.userNotification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entityType: "PmWork", eventType: "PM_ASSIGNED" }) }));
  });
  it("rejects a second concurrent start when the predicate changes no row", async () => {
    tx.pmWork.findFirstOrThrow.mockResolvedValue({ id: "work" }); tx.pmWork.updateMany.mockResolvedValue({ count: 0 });
    const { startPmWork } = await import("./pm-work-service"); await expect(startPmWork(technician, { ...scope, workId: "work" })).rejects.toThrow("already started"); expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
  it("requires a note for Abnormal completion before opening a transaction", async () => {
    const { completePmWork } = await import("./pm-work-service"); await expect(completePmWork(technician, { ...scope, workId: "work", result: "ABNORMAL", note: " " })).rejects.toThrow("note is required"); expect(transaction).not.toHaveBeenCalled();
  });
  it("records completing actor and time automatically", async () => {
    tx.pmWork.findFirstOrThrow.mockResolvedValue({ id: "work" }); const now = new Date("2026-08-15T02:00:00Z");
    const { completePmWork } = await import("./pm-work-service"); await completePmWork(technician, { ...scope, workId: "work", result: "NORMAL", now });
    expect(tx.pmWork.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "IN_PROGRESS" }), data: expect.objectContaining({ status: "COMPLETED", completedById: "tech", completedAt: now, result: "NORMAL" }) }));
  });
  it("does not let management permission substitute for execution permission", async () => {
    const { startPmWork } = await import("./pm-work-service"); await expect(startPmWork(manager, { ...scope, workId: "work" })).rejects.toThrow("cannot execute");
  });
  it("preserves completed before/after values and a correction reason in one audit", async () => {
    const before = { id: "work", status: "COMPLETED", result: "ABNORMAL", resultNote: "noise", correctedAt: null, correctedById: null, correctionReason: null, updatedAt: new Date("2026-08-15T01:00:00Z") }; tx.pmWork.findFirstOrThrow.mockResolvedValue(before);
    const { correctCompletedPmWorkResult } = await import("./pm-work-service"); await correctCompletedPmWorkResult(manager, { ...scope, workId: "work", result: "NORMAL", reason: "inspected again" });
    const event = tx.auditEvent.create.mock.calls[0][0].data; expect(JSON.parse(event.beforeJson)).toMatchObject({ result: "ABNORMAL", resultNote: "noise" }); expect(JSON.parse(event.afterJson)).toMatchObject({ result: "NORMAL", correctionReason: "inspected again" });
  });
  it("blocks whole-plan cancellation once any work has started", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", status: "CONFIRMED" }); tx.pmWork.count.mockResolvedValue(1);
    const { cancelConfirmedPmPlan } = await import("./pm-work-service"); await expect(cancelConfirmedPmPlan(manager, { ...scope, planId: "plan", reason: "weather" })).rejects.toThrow("started work"); expect(tx.pmPlan.updateMany).not.toHaveBeenCalled();
  });
  it("adds one eligible same-Site Asset without renumbering existing work", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", number: "PMP-SITE-20260815-001" }); tx.pmPlan.update.mockResolvedValue({ lastWorkSequence: 4 }); tx.asset.findFirstOrThrow.mockResolvedValue({ id: "asset", code: "A-1", nameTh: "Pump" }); tx.pmWork.findUnique.mockResolvedValue(null); tx.pmWork.create.mockResolvedValue({ id: "new", number: "PM-SITE-20260815-001-004" });
    const { addAssetToConfirmedPmPlan } = await import("./pm-work-service"); await addAssetToConfirmedPmPlan(manager, { ...scope, planId: "plan", assetId: "asset", reason: "field request" });
    expect(tx.pmWork.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ number: "PM-SITE-20260815-001-004", addedAfterConfirmation: true }) }));
    expect(tx.pmPlan.update).toHaveBeenCalledWith({ where: { id: "plan" }, data: { lastWorkSequence: { increment: 1 } }, select: { lastWorkSequence: true } });
    expect(tx.pmWork.count).not.toHaveBeenCalled();
  });
  it("retries a serialization collision before reserving a distinct suffix", async () => {
    transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "5.22.0" })).mockImplementationOnce(async fn => fn(tx));
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", number: "PMP-SITE-20260815-001" }); tx.pmPlan.update.mockResolvedValue({ lastWorkSequence: 5 }); tx.asset.findFirstOrThrow.mockResolvedValue({ id: "asset-2", code: "A-2", nameTh: "Motor" }); tx.pmWork.findUnique.mockResolvedValue(null); tx.pmWork.create.mockResolvedValue({ id: "new-2", number: "PM-SITE-20260815-001-005" });
    const { addAssetToConfirmedPmPlan } = await import("./pm-work-service"); await expect(addAssetToConfirmedPmPlan(manager, { ...scope, planId: "plan", assetId: "asset-2", reason: "scope" })).resolves.toMatchObject({ number: "PM-SITE-20260815-001-005" }); expect(transaction).toHaveBeenCalledTimes(2);
  });
  it("maps only the same-plan same-Asset collision and preserves unexpected unique errors", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", number: "PMP-SITE-20260815-001" }); tx.pmPlan.update.mockResolvedValue({ lastWorkSequence: 6 }); tx.asset.findFirstOrThrow.mockResolvedValue({ id: "asset", code: "A", nameTh: "Pump" }); tx.pmWork.findUnique.mockResolvedValue(null);
    const { addAssetToConfirmedPmPlan } = await import("./pm-work-service");
    tx.pmWork.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate asset", { code: "P2002", clientVersion: "5.22.0", meta: { target: ["pmPlanId", "assetId"] } })); await expect(addAssetToConfirmedPmPlan(manager, { ...scope, planId: "plan", assetId: "asset", reason: "x" })).rejects.toThrow("already has PM work");
    const unexpected = new Prisma.PrismaClientKnownRequestError("duplicate number", { code: "P2002", clientVersion: "5.22.0", meta: { target: ["number"] } }); tx.pmWork.create.mockRejectedValueOnce(unexpected); await expect(addAssetToConfirmedPmPlan(manager, { ...scope, planId: "plan", assetId: "asset", reason: "x" })).rejects.toBe(unexpected);
  });
  it("uses updatedAt as correction CAS so a stale same-value correction cannot audit", async () => {
    tx.pmWork.findFirstOrThrow.mockResolvedValue({ id: "work", status: "COMPLETED", result: "NORMAL", resultNote: null, correctedAt: null, correctedById: null, correctionReason: null, updatedAt: new Date("2026-08-15T01:00:00Z") }); tx.pmWork.updateMany.mockResolvedValue({ count: 0 });
    const { correctCompletedPmWorkResult } = await import("./pm-work-service"); await expect(correctCompletedPmWorkResult(manager, { ...scope, workId: "work", result: "NORMAL", reason: "stale" })).rejects.toThrow("changed while correcting"); expect(tx.auditEvent.create).not.toHaveBeenCalled();
    expect(tx.pmWork.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ updatedAt: new Date("2026-08-15T01:00:00Z") }) }));
  });
  it("derives overdue without changing lifecycle status and retains retired work", async () => {
    db.pmWork.findFirstOrThrow.mockResolvedValue({ id: "work", status: "PLANNED", pmPlan: { plannedDateKey: "2026-08-14" }, asset: { registrationStatus: "CANCELED" }, assignees: [], sourceGroups: [] });
    const { getPmWorkDetail } = await import("./pm-work-service"); await expect(getPmWorkDetail(manager, { ...scope, workId: "work", todayDateKey: "2026-08-15" })).resolves.toMatchObject({ status: "PLANNED", overdue: true, retiredAsset: true });
  });
  it("rejects cross-Site mutation before database work", async () => {
    const { cancelPmWork } = await import("./pm-work-service"); await expect(cancelPmWork(technician, { organizationId: "org", plantId: "other", workId: "work", reason: "x" })).rejects.toThrow("outside your Site"); expect(transaction).not.toHaveBeenCalled();
  });
});
