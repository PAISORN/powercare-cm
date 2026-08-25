import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const tx = {
  plant: { findFirstOrThrow: vi.fn() },
  asset: { findMany: vi.fn() },
  pmGroup: {
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pmGroupAsset: { deleteMany: vi.fn(), createMany: vi.fn() },
  pmPlanGroupSnapshot: { count: vi.fn() },
  pmPlanDraftGroup: { deleteMany: vi.fn() },
  auditEvent: { create: vi.fn() },
};

const transaction = vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx));

vi.mock("../../lib/db", () => ({ db: { $transaction: transaction } }));

const owner = { id: "owner-1", role: RoleName.ADMIN };
const siteAdmin = {
  id: "admin-1",
  role: RoleName.SITE_ADMIN,
  organizationId: "org-1",
  plantId: "site-1",
};
const scope = { organizationId: "org-1", plantId: "site-1" };

function group(overrides: Record<string, unknown> = {}) {
  return {
    id: "group-1",
    organizationId: "org-1",
    plantId: "site-1",
    code: "PM-A",
    name: "Group A",
    active: true,
    firstUsedAt: null,
    assets: [{ assetId: "asset-parent" }, { assetId: "asset-child" }],
    ...overrides,
  };
}

describe("PM Group validation", () => {
  it("normalizes required identity fields and rejects duplicate membership IDs", async () => {
    const { normalizePmGroupAssetIds, normalizePmGroupCode, normalizePmGroupName } = await import("./pm-validation");
    expect(normalizePmGroupCode("  pm daily  ")).toBe("PM-DAILY");
    expect(normalizePmGroupName("  Daily pumps  ")).toBe("Daily pumps");
    expect(() => normalizePmGroupCode("  ")).toThrow("code is required");
    expect(() => normalizePmGroupName("  ")).toThrow("name is required");
    expect(() => normalizePmGroupAssetIds(["asset-1", " asset-1 "])).toThrow("only once");
  });
});

describe("PM Group service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site-1" });
    tx.asset.findMany.mockResolvedValue([]);
    tx.auditEvent.create.mockResolvedValue({ id: "audit-1" });
    tx.pmGroupAsset.deleteMany.mockResolvedValue({ count: 0 });
    tx.pmGroupAsset.createMany.mockResolvedValue({ count: 0 });
    tx.pmPlanDraftGroup.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("creates an empty group, normalizes identity, and audits scope and membership", async () => {
    tx.pmGroup.create.mockResolvedValue(group({ code: "PM-DAILY", name: "Daily pumps", assets: [] }));
    const { createPmGroup } = await import("./pm-group-service");

    await createPmGroup(siteAdmin, { ...scope, code: " pm daily ", name: " Daily pumps ", assetIds: [] });

    expect(tx.pmGroup.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ...scope, code: "PM-DAILY", name: "Daily pumps", assets: undefined }),
    }));
    const audit = tx.auditEvent.create.mock.calls[0][0].data;
    expect(audit.action).toBe("CREATE_PM_GROUP");
    expect(JSON.parse(audit.afterJson)).toEqual(expect.objectContaining({ membershipIds: [], scope }));
  });

  it("rejects duplicate Site code conflicts with a stable domain error", async () => {
    tx.pmGroup.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002",
      clientVersion: "5.22.0",
    }));
    const { createPmGroup } = await import("./pm-group-service");
    await expect(createPmGroup(owner, { ...scope, code: "PM-A", name: "A" }))
      .rejects.toThrow("code already exists in this Site");
  });

  it("enforces layered permission and actor Site scope server-side", async () => {
    const { createPmGroup } = await import("./pm-group-service");
    await expect(createPmGroup(
      { id: "tech", role: RoleName.TECHNICIAN, organizationId: "org-1", plantId: "site-1" },
      { ...scope, code: "PM-A", name: "A" },
    )).rejects.toThrow("cannot manage PM Groups");
    await expect(createPmGroup(siteAdmin, {
      organizationId: "org-1", plantId: "site-2", code: "PM-A", name: "A",
    })).rejects.toThrow("outside your Site");
    expect(tx.pmGroup.create).not.toHaveBeenCalled();
  });

  it("rejects cross-Site or inactive Assets before replacing membership", async () => {
    tx.pmGroup.findFirstOrThrow.mockResolvedValue(group());
    tx.asset.findMany.mockResolvedValue([{ id: "asset-parent" }]);
    const { replacePmGroupMembership } = await import("./pm-group-service");

    await expect(replacePmGroupMembership(siteAdmin, {
      ...scope, groupId: "group-1", assetIds: ["asset-parent", "asset-other-site"],
    })).rejects.toThrow("actively registered in the selected Site");
    expect(tx.asset.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["asset-parent", "asset-other-site"] }, plantId: "site-1", registrationStatus: "ACTIVE" },
      select: { id: true },
    });
    expect(tx.pmGroupAsset.deleteMany).not.toHaveBeenCalled();
  });

  it("replaces exactly the posted Parent and Child IDs atomically and audits before/after IDs", async () => {
    tx.pmGroup.findFirstOrThrow
      .mockResolvedValueOnce(group({ assets: [{ assetId: "old" }] }))
      .mockResolvedValueOnce(group());
    tx.asset.findMany.mockResolvedValue([{ id: "asset-parent" }, { id: "asset-child" }]);
    tx.pmGroupAsset.createMany.mockResolvedValue({ count: 2 });
    const { replacePmGroupMembership } = await import("./pm-group-service");

    await replacePmGroupMembership(siteAdmin, {
      ...scope, groupId: "group-1", assetIds: ["asset-parent", "asset-child"],
    });

    expect(tx.pmGroupAsset.createMany).toHaveBeenCalledWith({ data: [
      { pmGroupId: "group-1", plantId: "site-1", assetId: "asset-parent" },
      { pmGroupId: "group-1", plantId: "site-1", assetId: "asset-child" },
    ] });
    const audit = tx.auditEvent.create.mock.calls[0][0].data;
    expect(JSON.parse(audit.beforeJson).membershipIds).toEqual(["old"]);
    expect(JSON.parse(audit.afterJson)).toEqual({ membershipIds: ["asset-child", "asset-parent"], scope });
  });

  it("locks a used code but permits its name to change", async () => {
    tx.pmGroup.findFirstOrThrow.mockResolvedValue(group({ firstUsedAt: new Date() }));
    const { updatePmGroupIdentity } = await import("./pm-group-service");
    await expect(updatePmGroupIdentity(siteAdmin, {
      ...scope, groupId: "group-1", code: "PM-B", name: "New name",
    })).rejects.toThrow("code cannot be changed");

    tx.pmGroup.update.mockResolvedValue(group({ firstUsedAt: new Date(), name: "New name" }));
    await expect(updatePmGroupIdentity(siteAdmin, {
      ...scope, groupId: "group-1", code: "pm-a", name: "New name",
    })).resolves.toEqual(expect.objectContaining({ name: "New name" }));
  });

  it("permits an unused code to change", async () => {
    tx.pmGroup.findFirstOrThrow.mockResolvedValue(group());
    tx.pmGroup.update.mockResolvedValue(group({ code: "PM-B" }));
    const { updatePmGroupIdentity } = await import("./pm-group-service");
    await updatePmGroupIdentity(siteAdmin, { ...scope, groupId: "group-1", code: "pm-b", name: "Group A" });
    expect(tx.pmGroup.update).toHaveBeenCalledWith(expect.objectContaining({ data: { code: "PM-B", name: "Group A" } }));
  });

  it("validates the complete membership before an atomic identity and membership edit", async () => {
    tx.pmGroup.findFirstOrThrow.mockResolvedValue(group());
    tx.asset.findMany.mockResolvedValue([{ id: "asset-parent" }]);
    const { updatePmGroup } = await import("./pm-group-service");

    await expect(updatePmGroup(siteAdmin, {
      ...scope,
      groupId: "group-1",
      code: "PM-B",
      name: "Changed before invalid membership",
      assetIds: ["asset-parent", "asset-other-site"],
    })).rejects.toThrow("actively registered in the selected Site");

    expect(tx.pmGroup.update).not.toHaveBeenCalled();
    expect(tx.pmGroupAsset.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("updates identity and full membership with one coherent audit", async () => {
    tx.pmGroup.findFirstOrThrow
      .mockResolvedValueOnce(group({ assets: [{ assetId: "old" }] }))
      .mockResolvedValueOnce(group({ code: "PM-B", name: "Group B", assets: [{ assetId: "asset-parent" }] }));
    tx.asset.findMany.mockResolvedValue([{ id: "asset-parent" }]);
    const { updatePmGroup } = await import("./pm-group-service");

    await updatePmGroup(siteAdmin, {
      ...scope,
      groupId: "group-1",
      code: "pm-b",
      name: "Group B",
      assetIds: ["asset-parent"],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.pmGroup.update).toHaveBeenCalledWith(expect.objectContaining({ data: { code: "PM-B", name: "Group B" } }));
    expect(tx.pmGroupAsset.deleteMany).toHaveBeenCalled();
    expect(tx.pmGroupAsset.createMany).toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1);
    const audit = tx.auditEvent.create.mock.calls[0][0].data;
    expect(audit.action).toBe("UPDATE_PM_GROUP");
    expect(JSON.parse(audit.beforeJson)).toEqual(expect.objectContaining({ code: "PM-A", membershipIds: ["old"] }));
    expect(JSON.parse(audit.afterJson)).toEqual(expect.objectContaining({ code: "PM-B", membershipIds: ["asset-parent"] }));
  });

  it("allows an existing inactive membership to be removed while validating every retained member", async () => {
    tx.pmGroup.findFirstOrThrow
      .mockResolvedValueOnce(group({ assets: [{ assetId: "stale" }, { assetId: "asset-parent" }] }))
      .mockResolvedValueOnce(group({ assets: [{ assetId: "asset-parent" }] }));
    tx.asset.findMany.mockResolvedValue([{ id: "asset-parent" }]);
    const { updatePmGroup } = await import("./pm-group-service");

    await updatePmGroup(siteAdmin, {
      ...scope,
      groupId: "group-1",
      code: "PM-A",
      name: "Group A",
      assetIds: ["asset-parent"],
    });

    expect(tx.asset.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["asset-parent"] }, plantId: "site-1", registrationStatus: "ACTIVE" },
      select: { id: true },
    });
    expect(tx.pmGroupAsset.createMany).toHaveBeenCalledWith({ data: [
      { pmGroupId: "group-1", plantId: "site-1", assetId: "asset-parent" },
    ] });
    expect(JSON.parse(tx.auditEvent.create.mock.calls[0][0].data.beforeJson).membershipIds).toEqual(["asset-parent", "stale"]);
    expect(JSON.parse(tx.auditEvent.create.mock.calls[0][0].data.afterJson).membershipIds).toEqual(["asset-parent"]);
  });

  it("maps an atomic edit code conflict to the stable domain error", async () => {
    tx.pmGroup.findFirstOrThrow.mockResolvedValue(group());
    tx.asset.findMany.mockResolvedValue([]);
    tx.pmGroup.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002",
      clientVersion: "5.22.0",
    }));
    const { updatePmGroup } = await import("./pm-group-service");

    await expect(updatePmGroup(owner, {
      ...scope, groupId: "group-1", code: "PM-B", name: "B", assetIds: [],
    })).rejects.toThrow("code already exists in this Site");
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("deactivates rather than deletes a group with a confirmed snapshot", async () => {
    tx.pmGroup.findFirstOrThrow.mockResolvedValue(group());
    tx.pmPlanGroupSnapshot.count.mockResolvedValue(1);
    tx.pmGroup.update.mockResolvedValue(group({ active: false }));
    const { deleteUnusedPmGroup } = await import("./pm-group-service");
    await expect(deleteUnusedPmGroup(siteAdmin, { ...scope, groupId: "group-1" }))
      .resolves.toEqual(expect.objectContaining({ outcome: "DEACTIVATED" }));
    expect(tx.pmGroup.delete).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DEACTIVATE_USED_PM_GROUP" }),
    }));
  });

  it("deletes a group with no snapshot and removes non-historical Draft references", async () => {
    tx.pmGroup.findFirstOrThrow.mockResolvedValue(group());
    tx.pmPlanGroupSnapshot.count.mockResolvedValue(0);
    tx.pmGroup.delete.mockResolvedValue(group());
    const { deleteUnusedPmGroup } = await import("./pm-group-service");
    await expect(deleteUnusedPmGroup(siteAdmin, { ...scope, groupId: "group-1" }))
      .resolves.toEqual({ outcome: "DELETED", group: null });
    expect(tx.pmPlanDraftGroup.deleteMany).toHaveBeenCalledBefore(tx.pmGroup.delete);
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DELETE_UNUSED_PM_GROUP" }),
    }));
  });
});
