import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

const db = { category: { findMany: vi.fn() }, zone: { findMany: vi.fn() } };
const createRepairRequest = vi.fn();
const persistPmLinkedCmNotification = vi.fn();
vi.mock("../../lib/db", () => ({ db }));
vi.mock("../cm-work/cm-work-service", () => ({ createRepairRequest }));
vi.mock("./pm-notification-service", () => ({ persistPmLinkedCmNotification }));
const scope = { organizationId: "org", plantId: "site" };
const actor = { id: "u1", fullName: "ช่างหนึ่ง", department: "Maintenance", role: RoleName.TECHNICIAN, ...scope };
const pmWorkUpdatedAt = new Date("2026-08-15T08:00:00Z");

describe("PM to CM handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRepairRequest.mockImplementation(async input => { const cm = { id: "cm1", number: "CM-001" }; await input.internalPmOrigin?.persistLinkedNotification?.({ transaction: true }, cm); return cm; });
    persistPmLinkedCmNotification.mockResolvedValue(1);
  });
  it("creates one linked CM with a deterministic submission key", async () => {
    const { createCmFromAbnormalPm } = await import("./pm-cm-service");
    await createCmFromAbnormalPm(actor, { ...scope, workId: "pm1", pmWorkUpdatedAt, categoryId: "cat", zoneId: "zone" });
    expect(createRepairRequest).toHaveBeenCalledWith(expect.objectContaining({ submissionKey: "pm-work:pm1:cm", internalPmOrigin: expect.objectContaining({ organizationId: "org", plantId: "site", actorId: "u1", pmWorkId: "pm1", pmWorkUpdatedAt }), categoryId: "cat", zoneId: "zone" }));
    expect(persistPmLinkedCmNotification).toHaveBeenCalledWith({ transaction: true }, "pm1", "CM-001");
  });
  it("delegates repeat submission to the CM transaction's canonical origin guard", async () => {
    const { createCmFromAbnormalPm } = await import("./pm-cm-service");
    await expect(createCmFromAbnormalPm(actor, { ...scope, workId: "pm1", pmWorkUpdatedAt, categoryId: "cat", zoneId: "zone" })).resolves.toMatchObject({ id: "cm1" });
    expect(createRepairRequest).toHaveBeenCalledOnce();
  });
  it("requires active Category and Zone in the same Site", async () => {
    const { createCmFromAbnormalPm } = await import("./pm-cm-service");
    createRepairRequest.mockRejectedValueOnce(new Error("Category must be active and belong to the same Site"));
    await expect(createCmFromAbnormalPm(actor, { ...scope, workId: "pm1", pmWorkUpdatedAt, categoryId: "foreign", zoneId: "zone" })).rejects.toThrow("same Site");
    createRepairRequest.mockRejectedValueOnce(new Error("Zone must be active and belong to the same Site"));
    await expect(createCmFromAbnormalPm(actor, { ...scope, workId: "pm1", pmWorkUpdatedAt, categoryId: "cat", zoneId: "foreign" })).rejects.toThrow("same Site");
  });
  it("rejects missing CM permission and cross-Site scope", async () => {
    const denied = { ...actor, userPermissionOverrides: [{ userId: "u1", permissionKey: PermissionKey.CREATE_INTERNAL_REQUEST, decision: "DENY" }] };
    const { createCmFromAbnormalPm } = await import("./pm-cm-service");
    await expect(createCmFromAbnormalPm(denied, { ...scope, workId: "pm1", pmWorkUpdatedAt, categoryId: "cat", zoneId: "zone" })).rejects.toThrow("cannot create CM");
    await expect(createCmFromAbnormalPm(actor, { organizationId: "org", plantId: "other", workId: "pm1", pmWorkUpdatedAt, categoryId: "cat", zoneId: "zone" })).rejects.toThrow("outside your Site");
    expect(createRepairRequest).not.toHaveBeenCalled();
  });
  it("normal or unfinished PM cannot reach CM creation", async () => {
    createRepairRequest.mockRejectedValue(new Error("not found"));
    const { createCmFromAbnormalPm } = await import("./pm-cm-service");
    await expect(createCmFromAbnormalPm(actor, { ...scope, workId: "pm1", pmWorkUpdatedAt, categoryId: "cat", zoneId: "zone" })).rejects.toThrow("not found");
    expect(createRepairRequest).toHaveBeenCalledOnce();
  });
});
