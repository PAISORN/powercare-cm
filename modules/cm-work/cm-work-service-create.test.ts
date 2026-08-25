import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  cmWork: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
  plant: { findFirstOrThrow: vi.fn(), findUnique: vi.fn() },
  pmWork: { findFirstOrThrow: vi.fn() }, category: { findFirst: vi.fn() }, zone: { findFirst: vi.fn() },
  auditEvent: { create: vi.fn() }, cmNumberSequence: { findUnique: vi.fn(), upsert: vi.fn() },
};
const transaction = vi.fn(async (operation: (client: typeof tx) => unknown, _options?: unknown) => operation(tx));
const db = { $transaction: transaction, cmWork: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() }, user: { findUnique: vi.fn() } };
const recordAudit = vi.fn(); const createCmNotifications = vi.fn();
vi.mock("../../lib/db", () => ({ db }));
vi.mock("../audit/audit-service", () => ({ recordAudit }));
vi.mock("./cm-work-sequence", () => ({ reserveCmWorkNumber: vi.fn().mockResolvedValue("CM-SITE-202608-0001") }));
vi.mock("../notifications/notification-service", () => ({ createCmNotifications }));
vi.mock("../line/line-service", () => ({ dispatchLineWorkEvent: vi.fn() }));
vi.mock("../line/line-work-event", () => ({ mapCmNotificationToLineEvent: vi.fn().mockReturnValue(null) }));
vi.mock("../../lib/query-cache", () => ({ cacheTags: { dashboardSummary: "dashboard" }, revalidateCmData: vi.fn() }));

const origin = { organizationId: "org-a", plantId: "site-a", actorId: "actor", pmWorkId: "pm-1", pmWorkUpdatedAt: new Date("2026-08-15T08:00:00Z") };
const input = { submissionKey: "pm-work:pm-1:cm", requesterName: "Tech", requesterDepartment: "Maintenance", categoryId: "cat", zoneId: "zone", machineName: "Pump", assetId: "asset", problemTitle: "PM abnormal", problemDetail: "Noise", urgency: "NORMAL" as const, internalPmOrigin: origin };

describe("trusted PM repair request creation", () => {
  beforeEach(() => {
    vi.clearAllMocks(); transaction.mockImplementation(async operation => operation(tx));
    tx.cmWork.findUnique.mockResolvedValue(null); tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site-a", code: "SITE", organizationId: "org-a", maxWorkRequests: null });
    tx.pmWork.findFirstOrThrow.mockResolvedValue({ id: "pm-1", number: "PM-1", resultNote: "Noise", asset: { id: "asset", code: "A-1", nameTh: "Pump", nameEn: null } });
    tx.category.findFirst.mockResolvedValue({ id: "cat" }); tx.zone.findFirst.mockResolvedValue({ id: "zone" });
    tx.cmWork.create.mockResolvedValue({ id: "cm-1", number: "CM-1", submissionKey: input.submissionKey, originatingPmWorkId: "pm-1", organizationId: "org-a", plantId: "site-a" }); tx.auditEvent.create.mockResolvedValue({});
    db.cmWork.findUniqueOrThrow.mockResolvedValue({ id: "cm-1", number: "CM-1", organizationId: "org-a", plantId: "site-a", categoryId: "cat", category: { name: "Mechanical" }, claimantId: null, machineName: "Pump", statusHistory: [] });
  });

  it("uses exact org/Site identity despite duplicate Site codes and validates all related records inside one transaction", async () => {
    const { createRepairRequest } = await import("./cm-work-service"); await createRepairRequest(input);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(tx.plant.findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "site-a", organizationId: "org-a", active: true, organization: { active: true } } }));
    expect(tx.pmWork.findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "pm-1", plantId: "site-a", updatedAt: origin.pmWorkUpdatedAt, status: "COMPLETED", result: "ABNORMAL", pmPlan: { organizationId: "org-a" } }),
    }));
    expect(tx.category.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "cat", organizationId: "org-a", plantId: "site-a", active: true } }));
    expect(tx.zone.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "zone", plantId: "site-a", active: true } }));
  });

  it("retries P2034 with all validation reads and refuses when PM changed to Normal", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "5.22.0" });
    transaction.mockRejectedValueOnce(conflict).mockImplementationOnce(async operation => operation(tx));
    tx.pmWork.findFirstOrThrow.mockRejectedValueOnce(new Error("PM work no longer Abnormal"));
    const { createRepairRequest } = await import("./cm-work-service");
    await expect(createRepairRequest(input)).rejects.toThrow("no longer Abnormal");
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(transaction.mock.calls[1][1]).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(tx.cmWork.create).not.toHaveBeenCalled();
  });

  it("retries P2034 and refuses when a same-Site master was deactivated", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "5.22.0" });
    transaction.mockRejectedValueOnce(conflict).mockImplementationOnce(async operation => operation(tx));
    tx.category.findFirst.mockResolvedValueOnce(null);
    const { createRepairRequest } = await import("./cm-work-service");
    await expect(createRepairRequest(input)).rejects.toThrow("Category must be active");
    expect(transaction).toHaveBeenCalledTimes(2); expect(tx.cmWork.create).not.toHaveBeenCalled();
  });

  it("writes the actor-scoped creation audit in the same transaction and skips the legacy post-commit audit", async () => {
    const { createRepairRequest } = await import("./cm-work-service"); await createRepairRequest(input);
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cmWorkId: "cm-1", actorId: "actor", organizationId: "org-a", plantId: "site-a", action: "CREATE_REPAIR_REQUEST" }) });
    expect(recordAudit).not.toHaveBeenCalled(); expect(createCmNotifications).toHaveBeenCalledOnce();
  });

  it("persists linked-PM notification intent inside the trusted CM transaction", async () => {
    const persistLinkedNotification = vi.fn().mockResolvedValue(1);
    const { createRepairRequest } = await import("./cm-work-service");
    await createRepairRequest({ ...input, internalPmOrigin: { ...origin, persistLinkedNotification } });
    expect(persistLinkedNotification).toHaveBeenCalledWith(tx, expect.objectContaining({ id: "cm-1" }));
    persistLinkedNotification.mockRejectedValueOnce(new Error("notification persistence failed"));
    await expect(createRepairRequest({ ...input, internalPmOrigin: { ...origin, persistLinkedNotification } })).rejects.toThrow("notification persistence failed");
  });

  it("does not create or audit when an active same-Site relation fails revalidation", async () => {
    tx.category.findFirst.mockResolvedValueOnce(null);
    const { createRepairRequest } = await import("./cm-work-service");
    await expect(createRepairRequest(input)).rejects.toThrow("Category must be active");
    expect(tx.cmWork.create).not.toHaveBeenCalled(); expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("returns only the canonical same-origin same-scope same-key CM", async () => {
    tx.cmWork.findUnique.mockResolvedValueOnce({ id: "cm-1", submissionKey: input.submissionKey, originatingPmWorkId: "pm-1", organizationId: "org-a", plantId: "site-a" });
    const { createRepairRequest } = await import("./cm-work-service");
    await expect(createRepairRequest(input)).resolves.toMatchObject({ id: "cm-1" }); expect(tx.cmWork.create).not.toHaveBeenCalled();
  });

  it("rejects legacy/different-key origin and submission-key collisions", async () => {
    const { createRepairRequest } = await import("./cm-work-service");
    tx.cmWork.findUnique.mockResolvedValueOnce({ id: "legacy", submissionKey: "legacy-key", originatingPmWorkId: "pm-1", organizationId: "org-a", plantId: "site-a" });
    await expect(createRepairRequest(input)).rejects.toThrow("origin collision");
    tx.cmWork.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "other", submissionKey: input.submissionKey, originatingPmWorkId: null, organizationId: "org-a", plantId: "site-a" });
    await expect(createRepairRequest(input)).rejects.toThrow("submission key collision");
  });

  it("recovers a unique race by origin only when the canonical key and scope match", async () => {
    const collision = new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "5.22.0" });
    transaction.mockRejectedValueOnce(collision); db.cmWork.findUnique.mockResolvedValueOnce({ id: "cm-race", submissionKey: input.submissionKey, originatingPmWorkId: "pm-1", organizationId: "org-a", plantId: "site-a" });
    const { createRepairRequest } = await import("./cm-work-service"); await expect(createRepairRequest(input)).resolves.toMatchObject({ id: "cm-race" });
    transaction.mockRejectedValueOnce(collision); db.cmWork.findUnique.mockResolvedValueOnce({ id: "wrong", submissionKey: "different", originatingPmWorkId: "pm-1", organizationId: "org-a", plantId: "site-a" });
    await expect(createRepairRequest(input)).rejects.toThrow("origin collision");
  });
});
