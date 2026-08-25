import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const tx = { plant: { findFirstOrThrow: vi.fn() }, pmPlan: { create: vi.fn(), findFirstOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() }, pmGroup: { findFirstOrThrow: vi.fn(), updateMany: vi.fn() }, pmPlanDraftGroup: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() }, pmPlanSequence: { upsert: vi.fn() }, pmPlanGroupSnapshot: { create: vi.fn() }, pmWork: { create: vi.fn() }, pmWorkSourceGroup: { create: vi.fn() }, auditEvent: { create: vi.fn() } };
const transaction = vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx));
const db = { pmPlan: { findUnique: vi.fn(), findFirst: vi.fn(), findFirstOrThrow: vi.fn() }, $transaction: transaction };
vi.mock("../../lib/db", () => ({ db }));
const admin = { id: "admin", role: RoleName.SITE_ADMIN, organizationId: "org", plantId: "site" };
const scope = { organizationId: "org", plantId: "site" };

describe("PM Draft plan service", () => {
  beforeEach(() => { vi.clearAllMocks(); transaction.mockImplementation(async (fn: (client: typeof tx) => unknown) => fn(tx)); tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site" }); tx.auditEvent.create.mockResolvedValue({}); tx.pmPlanDraftGroup.findMany.mockResolvedValue([]); db.pmPlan.findUnique.mockResolvedValue(null); });
  it("creates an unnumbered Draft with no PM Work and audits it", async () => {
    tx.pmPlan.create.mockResolvedValue({ id: "plan", ...scope, plannedDateKey: "2026-08-15", status: "DRAFT", number: null, submissionKey: "once" });
    const { createOrGetDraftPmPlan } = await import("./pm-plan-service");
    await createOrGetDraftPmPlan(admin, { ...scope, plannedDateKey: "2026-08-15", submissionKey: "once" });
    expect(tx.pmPlan.create).toHaveBeenCalledWith({ data: { ...scope, plannedDateKey: "2026-08-15", submissionKey: "once", status: "DRAFT" } });
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(tx.pmWork.create).not.toHaveBeenCalled();
  });
  it("returns the same scoped plan for a repeated submission key", async () => {
    db.pmPlan.findUnique.mockResolvedValue({ id: "plan", ...scope, plannedDateKey: "2026-08-15" });
    const { createOrGetDraftPmPlan } = await import("./pm-plan-service");
    await expect(createOrGetDraftPmPlan(admin, { ...scope, plannedDateKey: "2026-08-15", submissionKey: "once" })).resolves.toMatchObject({ id: "plan" });
    expect(tx.pmPlan.create).not.toHaveBeenCalled();
  });
  it("maps a concurrent date collision while preserving same-key idempotency", async () => {
    tx.pmPlan.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "5.22.0" }));
    db.pmPlan.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const { createOrGetDraftPmPlan } = await import("./pm-plan-service");
    await expect(createOrGetDraftPmPlan(admin, { ...scope, plannedDateKey: "2026-08-15", submissionKey: "new" })).rejects.toThrow("already occupies");
  });
  it("adds only an active same-Site group and deduplicates repeated selection", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", status: "DRAFT" }); tx.pmGroup.findFirstOrThrow.mockResolvedValue({ id: "g1" }); tx.pmPlanDraftGroup.findMany.mockResolvedValue([{ pmGroupId: "g1" }]);
    const { addDraftPmGroup } = await import("./pm-plan-service");
    await expect(addDraftPmGroup(admin, { ...scope, planId: "plan", groupId: "g1" })).resolves.toEqual({ added: false });
    expect(tx.pmGroup.findFirstOrThrow).toHaveBeenCalledWith({ where: { id: "g1", ...scope, active: true }, select: { id: true } }); expect(tx.pmPlanDraftGroup.create).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  });
  it("rechecks Draft status after a serializable interleaving conflict with confirmation", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValueOnce({ id: "plan", status: "DRAFT" }).mockRejectedValueOnce(new Error("Plan is no longer Draft"));
    tx.pmGroup.findFirstOrThrow.mockResolvedValue({ id: "g1" }); tx.pmPlanDraftGroup.create.mockResolvedValue({ id: "selection" });
    transaction.mockImplementationOnce(async (fn: (client: typeof tx) => unknown) => { await fn(tx); throw new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "5.22.0" }); });
    const { addDraftPmGroup } = await import("./pm-plan-service");
    await expect(addDraftPmGroup(admin, { ...scope, planId: "plan", groupId: "g1" })).rejects.toThrow("no longer Draft");
    expect(transaction).toHaveBeenCalledTimes(2); expect(tx.pmPlanDraftGroup.create).toHaveBeenCalledTimes(1);
  });
  it("recovers only the draft-group compound unique collision", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", status: "DRAFT" }); tx.pmGroup.findFirstOrThrow.mockResolvedValue({ id: "g1" });
    tx.pmPlanDraftGroup.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "5.22.0", meta: { target: ["pmPlanId", "pmGroupId"] } }));
    const { addDraftPmGroup } = await import("./pm-plan-service");
    await expect(addDraftPmGroup(admin, { ...scope, planId: "plan", groupId: "g1" })).resolves.toEqual({ added: false });
    tx.pmPlanDraftGroup.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("other duplicate", { code: "P2002", clientVersion: "5.22.0", meta: { target: ["anotherField"] } }));
    await expect(addDraftPmGroup(admin, { ...scope, planId: "plan", groupId: "g1" })).rejects.toMatchObject({ code: "P2002" });
  });
  it("removes only the requested Draft selection and audits the before/after group IDs", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", status: "DRAFT" }); tx.pmPlanDraftGroup.findMany.mockResolvedValue([{ pmGroupId: "g1" }, { pmGroupId: "g2" }]); tx.pmPlanDraftGroup.deleteMany.mockResolvedValue({ count: 1 });
    const { removeDraftPmGroup } = await import("./pm-plan-service"); await expect(removeDraftPmGroup(admin, { ...scope, planId: "plan", groupId: "g1" })).resolves.toEqual({ removed: true });
    expect(tx.pmPlanDraftGroup.deleteMany).toHaveBeenCalledWith({ where: { pmPlanId: "plan", pmGroupId: "g1", plantId: "site" } });
    const event = tx.auditEvent.create.mock.calls[0][0].data; expect(JSON.parse(event.beforeJson).groupIds).toEqual(["g1", "g2"]); expect(JSON.parse(event.afterJson).groupIds).toEqual(["g2"]);
  });
  it("does not audit an idempotent remove when no selection was deleted", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", status: "DRAFT" }); tx.pmPlanDraftGroup.findMany.mockResolvedValue([{ pmGroupId: "g2" }]); tx.pmPlanDraftGroup.deleteMany.mockResolvedValue({ count: 0 });
    const { removeDraftPmGroup } = await import("./pm-plan-service");
    await expect(removeDraftPmGroup(admin, { ...scope, planId: "plan", groupId: "g1" })).resolves.toEqual({ removed: false }); expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
  it("previews a deduplicated union with every source and reports empty/ineligible changes", async () => {
    db.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", draftGroups: [
      { pmGroup: { id: "g1", code: "G1", name: "One", active: true, assets: [{ asset: { id: "a1", code: "A1", nameTh: "Pump", registrationStatus: "ACTIVE", plantId: "site" } }] } },
      { pmGroup: { id: "g2", code: "G2", name: "Two", active: true, assets: [{ asset: { id: "a1", code: "A1", nameTh: "Pump", registrationStatus: "ACTIVE", plantId: "site" } }] } },
      { pmGroup: { id: "g3", code: "G3", name: "Empty", active: false, assets: [] } },
    ] });
    const { previewDraftPmPlan } = await import("./pm-plan-service"); const preview = await previewDraftPmPlan(admin, { ...scope, planId: "plan" });
    expect(preview.assets).toHaveLength(1); expect(preview.assets[0].sources.map(source => source.id)).toEqual(["g1", "g2"]); expect(preview.duplicateAssets).toHaveLength(1); expect(preview.emptyGroups).toHaveLength(1); expect(preview.retiredGroups).toHaveLength(1);
  });
  it("keeps an Asset eligible when at least one duplicate source remains active", async () => {
    db.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", draftGroups: [
      { pmGroup: { id: "active", code: "A", name: "Active", active: true, assets: [{ asset: { id: "asset", code: "AS", nameTh: "Asset", registrationStatus: "ACTIVE", plantId: "site" } }] } },
      { pmGroup: { id: "retired", code: "R", name: "Retired", active: false, assets: [{ asset: { id: "asset", code: "AS", nameTh: "Asset", registrationStatus: "ACTIVE", plantId: "site" } }] } },
    ] });
    const { previewDraftPmPlan } = await import("./pm-plan-service"); const preview = await previewDraftPmPlan(admin, { ...scope, planId: "plan" });
    expect(preview.assets[0].eligible).toBe(true); expect(preview.assets[0].sources).toHaveLength(2); expect(preview.ineligibleAssets).toHaveLength(0); expect(preview.retiredGroups).toHaveLength(1);
  });
  it("reschedules Draft with a status/date predicate and never changes a number", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", plannedDateKey: "2026-08-15", status: "DRAFT" }); tx.pmPlan.updateMany.mockResolvedValue({ count: 1 });
    const { rescheduleDraftPmPlan } = await import("./pm-plan-service"); await rescheduleDraftPmPlan(admin, { ...scope, planId: "plan", plannedDateKey: "2026-08-16" });
    expect(tx.pmPlan.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "DRAFT", plannedDateKey: "2026-08-15" }), data: expect.not.objectContaining({ number: expect.anything() }) }));
  });
  it("deletes only a scoped Draft with a conditional write predicate inside the audited transaction", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", plannedDateKey: "2026-08-15", status: "DRAFT" }); tx.pmPlan.deleteMany.mockResolvedValue({ count: 1 });
    const { deleteDraftPmPlan } = await import("./pm-plan-service"); await expect(deleteDraftPmPlan(admin, { ...scope, planId: "plan" })).resolves.toEqual({ deleted: true });
    expect(tx.pmPlan.deleteMany).toHaveBeenCalledWith({ where: { id: "plan", ...scope, status: "DRAFT" } }); expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "DELETE_PM_PLAN_DRAFT" }) }));
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  });
  it("does not audit or delete a plan that became Confirmed at the delete boundary", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValue({ id: "plan", plannedDateKey: "2026-08-15", status: "DRAFT" }); tx.pmPlan.deleteMany.mockResolvedValue({ count: 0 });
    const { deleteDraftPmPlan } = await import("./pm-plan-service");
    await expect(deleteDraftPmPlan(admin, { ...scope, planId: "plan" })).rejects.toThrow("no longer Draft"); expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
  it("retries a delete serialization conflict and refuses after confirmation wins", async () => {
    tx.pmPlan.findFirstOrThrow.mockResolvedValueOnce({ id: "plan", plannedDateKey: "2026-08-15", status: "DRAFT" }).mockRejectedValueOnce(new Error("Plan is no longer Draft")); tx.pmPlan.deleteMany.mockResolvedValue({ count: 1 });
    transaction.mockImplementationOnce(async (fn: (client: typeof tx) => unknown) => { await fn(tx); throw new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "5.22.0" }); });
    const { deleteDraftPmPlan } = await import("./pm-plan-service");
    await expect(deleteDraftPmPlan(admin, { ...scope, planId: "plan" })).rejects.toThrow("no longer Draft"); expect(transaction).toHaveBeenCalledTimes(2); expect(tx.pmPlan.deleteMany).toHaveBeenCalledTimes(1);
  });
  it("rejects management and scope escalation server-side", async () => {
    const { createOrGetDraftPmPlan } = await import("./pm-plan-service");
    await expect(createOrGetDraftPmPlan({ id: "tech", role: RoleName.TECHNICIAN, organizationId: "org", plantId: "site" }, { ...scope, plannedDateKey: "2026-08-15", submissionKey: "x" })).rejects.toThrow("cannot manage");
    await expect(createOrGetDraftPmPlan(admin, { organizationId: "org", plantId: "other", plannedDateKey: "2026-08-15", submissionKey: "x" })).rejects.toThrow("outside your Site");
  });
});

describe("PM plan confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (fn: (client: typeof tx) => unknown) => fn(tx));
    tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site", code: "RT-B" });
    tx.pmPlan.findFirstOrThrow
      .mockResolvedValueOnce({ id: "plan", ...scope, plannedDateKey: "2026-09-01", status: "DRAFT", submissionKey: "confirm-once", number: null })
      .mockResolvedValue({ id: "plan", status: "CONFIRMED", number: "PMP-RTB-20260901-001", works: [], groupSnapshots: [] });
    tx.pmPlan.updateMany.mockResolvedValue({ count: 1 });
    tx.pmPlanSequence.upsert.mockResolvedValue({ lastNumber: 1 });
    tx.pmPlanGroupSnapshot.create.mockImplementation(async ({ data }: { data: { sourcePmGroupId: string } }) => ({ id: `snapshot-${data.sourcePmGroupId}` }));
    tx.pmWork.create.mockImplementation(async ({ data }: { data: { assetId: string } }) => ({ id: `work-${data.assetId}` }));
    tx.pmWorkSourceGroup.create.mockResolvedValue({});
    tx.pmGroup.updateMany.mockResolvedValue({ count: 2 });
    tx.pmPlan.update.mockResolvedValue({});
    tx.auditEvent.create.mockResolvedValue({});
    db.pmPlan.findFirst.mockResolvedValue(null);
  });

  it("confirms once, deduplicates Assets, retains every source and orders work deterministically", async () => {
    tx.pmPlanDraftGroup.findMany.mockResolvedValue([
      { pmGroup: { id: "g1", code: "MECH", name: "Mechanical", active: true, assets: [
        { asset: { id: "asset-b", plantId: "site", code: "B-02", nameTh: "B", registrationStatus: "ACTIVE" } },
        { asset: { id: "asset-a", plantId: "site", code: "A-01", nameTh: "A", registrationStatus: "ACTIVE" } },
      ] } },
      { pmGroup: { id: "g2", code: "ELEC", name: "Electrical", active: true, assets: [
        { asset: { id: "asset-a", plantId: "site", code: "A-01", nameTh: "A", registrationStatus: "ACTIVE" } },
      ] } },
      { pmGroup: { id: "g3", code: "EMPTY", name: "Empty", active: true, assets: [] } },
    ]);
    const { confirmPmPlan } = await import("./pm-plan-service");
    await confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once", now: new Date("2026-09-01T04:00:00Z") });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(tx.pmWork.create).toHaveBeenCalledTimes(2);
    expect(tx.pmWork.create.mock.calls.map(call => call[0].data)).toEqual([
      expect.objectContaining({ assetId: "asset-a", number: "PM-RTB-20260901-001-001", assetCodeSnapshot: "A-01", assetNameSnapshot: "A" }),
      expect.objectContaining({ assetId: "asset-b", number: "PM-RTB-20260901-001-002", assetCodeSnapshot: "B-02", assetNameSnapshot: "B" }),
    ]);
    expect(tx.pmWorkSourceGroup.create).toHaveBeenCalledTimes(3);
    expect(tx.pmPlanGroupSnapshot.create).toHaveBeenCalledTimes(3);
    expect(tx.pmGroup.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { firstUsedAt: new Date("2026-09-01T04:00:00Z") } }));
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(tx.pmPlan.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ number: "PMP-RTB-20260901-001", status: "CONFIRMED", lastWorkSequence: 2 }) }));
  });

  it("rejects an all-empty or ineligible union before reserving a number", async () => {
    tx.pmPlanDraftGroup.findMany.mockResolvedValue([{ pmGroup: { id: "g1", code: "EMPTY", name: "Empty", active: true, assets: [{ asset: { id: "retired", plantId: "site", code: "R", nameTh: "R", registrationStatus: "CANCELED" } }] } }]);
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once", now: new Date("2026-09-01T04:00:00Z") })).rejects.toThrow("without eligible Assets");
    expect(tx.pmPlanSequence.upsert).not.toHaveBeenCalled();
    expect(tx.pmWork.create).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("returns the committed result when confirmation races with add/remove and retries", async () => {
    const confirmed = { id: "plan", ...scope, submissionKey: "confirm-once", status: "CONFIRMED", number: "PMP-RTB-20260901-001", works: [{ id: "work" }], groupSnapshots: [] };
    transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "5.22.0" }));
    db.pmPlan.findFirst.mockResolvedValue(confirmed);
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once" })).resolves.toEqual(confirmed);
    expect(transaction).toHaveBeenCalledTimes(3);
    expect(db.pmPlan.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ submissionKey: "confirm-once", status: "CONFIRMED" }) }));
  });

  it("recovers a same-submission unique race but rejects a different plan/date collision", async () => {
    const collision = new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "5.22.0", meta: { target: ["plantId", "plannedDateKey"] } });
    const confirmed = { id: "plan", ...scope, submissionKey: "confirm-once", status: "CONFIRMED", number: "PMP-RTB-20260901-001", works: [], groupSnapshots: [] };
    transaction.mockRejectedValueOnce(collision);
    db.pmPlan.findFirst.mockResolvedValueOnce(confirmed);
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once" })).resolves.toEqual(confirmed);
    transaction.mockRejectedValueOnce(collision);
    db.pmPlan.findFirst.mockResolvedValueOnce(null);
    await expect(confirmPmPlan(admin, { ...scope, planId: "other-plan", submissionKey: "other-key" })).rejects.toThrow("conflicts with another plan or submission");
  });

  it("preserves unrelated unique and exhausted serialization errors when nothing committed", async () => {
    const unrelated = new Prisma.PrismaClientKnownRequestError("unrelated unique", { code: "P2002", clientVersion: "5.22.0", meta: { target: ["number"] } });
    transaction.mockRejectedValueOnce(unrelated);
    db.pmPlan.findFirst.mockResolvedValueOnce(null);
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once" })).rejects.toBe(unrelated);

    const exhausted = new Prisma.PrismaClientKnownRequestError("serialization exhausted", { code: "P2034", clientVersion: "5.22.0" });
    transaction.mockRejectedValue(exhausted);
    db.pmPlan.findFirst.mockResolvedValueOnce(null);
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once" })).rejects.toBe(exhausted);
    expect(transaction).toHaveBeenCalledTimes(4);
  });

  it("returns immutable confirmed snapshots without reloading changed Draft memberships", async () => {
    const confirmed = { id: "plan", ...scope, submissionKey: "confirm-once", status: "CONFIRMED", number: "PMP-RTB-20260901-001", works: [{ id: "work", number: "PM-RTB-20260901-001-001", assetNameSnapshot: "Original" }], groupSnapshots: [{ id: "snapshot", nameSnapshot: "Original group" }] };
    tx.pmPlan.findFirstOrThrow.mockReset().mockResolvedValue(confirmed);
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once" })).resolves.toEqual(confirmed);
    expect(tx.pmPlanDraftGroup.findMany).not.toHaveBeenCalled();
    expect(tx.pmPlanSequence.upsert).not.toHaveBeenCalled();
    expect(tx.pmWork.create).not.toHaveBeenCalled();
  });

  it("does not perform final plan update or audit after a partial write failure", async () => {
    tx.pmPlanDraftGroup.findMany.mockResolvedValue([{ pmGroup: { id: "g1", code: "G1", name: "Group", active: true, assets: [{ asset: { id: "asset-a", plantId: "site", code: "A", nameTh: "A", registrationStatus: "ACTIVE" } }] } }]);
    tx.pmWorkSourceGroup.create.mockRejectedValue(new Error("injected failure"));
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "confirm-once", now: new Date("2026-09-01T04:00:00Z") })).rejects.toThrow("injected failure");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.pmPlan.update).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("rejects a different submission rather than returning another confirmed plan", async () => {
    tx.pmPlan.findFirstOrThrow.mockReset().mockResolvedValue({ id: "plan", ...scope, plannedDateKey: "2026-09-01", status: "DRAFT", submissionKey: "original", number: null });
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(admin, { ...scope, planId: "plan", submissionKey: "different" })).rejects.toThrow("belongs to another PM plan");
    expect(tx.pmPlanSequence.upsert).not.toHaveBeenCalled();
  });
});
