import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import {
  canExecutePmWork,
  canManagePmGroups,
  canManagePmPlans,
  canViewPm,
} from "../auth/permission";
import { PermissionKey, canUsePermission } from "../auth/site-admin-permissions";

const findFirstOrThrow = vi.fn();
const organizationFindFirstOrThrow = vi.fn();
const organizationFindUnique = vi.fn();
const organizationFindMany = vi.fn();
const plantFindMany = vi.fn();

vi.mock("../../lib/db", () => ({
  db: {
    organization: {
      findFirstOrThrow: organizationFindFirstOrThrow,
      findUnique: organizationFindUnique,
      findMany: organizationFindMany,
    },
    plant: { findFirstOrThrow, findMany: plantFindMany },
  },
}));

describe("PM permissions", () => {
  it("lets every authenticated role view PM", () => {
    for (const role of Object.values(RoleName)) expect(canViewPm(role)).toBe(true);
  });

  it("gives management defaults only to administrative roles", () => {
    for (const role of [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN, RoleName.SITE_ADMIN]) {
      expect(canManagePmGroups(role)).toBe(true);
      expect(canManagePmPlans(role)).toBe(true);
    }
    for (const role of [RoleName.ENGINEER, RoleName.TECHNICIAN, RoleName.STORE_OFFICER, RoleName.VISITOR]) {
      expect(canManagePmGroups(role)).toBe(false);
      expect(canManagePmPlans(role)).toBe(false);
    }
  });

  it("lets engineers and technicians execute by default", () => {
    expect(canExecutePmWork(RoleName.ENGINEER)).toBe(true);
    expect(canExecutePmWork(RoleName.TECHNICIAN)).toBe(true);
  });

  it("requires an explicit layered ALLOW for Owner Admin execution", () => {
    const owner = { id: "owner-1", role: RoleName.ADMIN, organizationId: "org-1" };
    expect(canExecutePmWork(owner)).toBe(false);
    expect(canExecutePmWork({
      ...owner,
      rolePermissionOverrides: [
        { scopeKey: "SYSTEM", role: RoleName.ADMIN, permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "ALLOW" },
      ],
    })).toBe(true);
    expect(canExecutePmWork({
      ...owner,
      rolePermissionOverrides: [
        { scopeKey: "SYSTEM", role: RoleName.ADMIN, permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "ALLOW" },
      ],
      userPermissionOverrides: [
        { userId: "owner-1", permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "DENY" },
      ],
    })).toBe(false);
  });

  it("supports organization and user execution grants for administrative roles", () => {
    const organizationAdmin = { id: "org-admin", role: RoleName.ORGANIZATION_ADMIN, organizationId: "org-1" };
    expect(canExecutePmWork(organizationAdmin)).toBe(false);
    expect(canExecutePmWork({
      ...organizationAdmin,
      rolePermissionOverrides: [
        { scopeKey: "ORG:org-1", organizationId: "org-1", role: RoleName.ORGANIZATION_ADMIN, permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "ALLOW" },
      ],
    })).toBe(true);
    expect(canExecutePmWork({
      id: "site-admin",
      role: RoleName.SITE_ADMIN,
      organizationId: "org-1",
      plantId: "site-1",
      userPermissionOverrides: [
        { userId: "site-admin", permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "ALLOW" },
      ],
    })).toBe(true);
  });

  it("lets a user DENY override a role ALLOW", () => {
    expect(canExecutePmWork({
      id: "tech-1",
      role: RoleName.TECHNICIAN,
      organizationId: "org-1",
      rolePermissionOverrides: [
        { scopeKey: "SYSTEM", role: RoleName.TECHNICIAN, permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "ALLOW" },
      ],
      userPermissionOverrides: [
        { userId: "tech-1", permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "DENY" },
      ],
    })).toBe(false);
  });

  it("does not accept PM permissions from legacy Site Admin checkbox rows", () => {
    expect(canUsePermission(
      { id: "site-admin", role: RoleName.SITE_ADMIN, plantId: "site-1" },
      PermissionKey.EXECUTE_PM_WORK,
      [{ userId: "site-admin", plantId: "site-1", permissionKey: PermissionKey.EXECUTE_PM_WORK, enabled: true }],
    )).toBe(false);
  });
});

describe("PM page scope", () => {
  beforeEach(() => {
    findFirstOrThrow.mockReset();
    organizationFindFirstOrThrow.mockReset();
    organizationFindUnique.mockReset();
    organizationFindMany.mockReset();
    plantFindMany.mockReset();
  });

  it("ignores submitted scope for fixed-site roles", async () => {
    findFirstOrThrow.mockResolvedValue({
      id: "site-a",
      name: "Site A",
      code: "A",
      organization: { id: "org-a", name: "Org A", slug: "org-a" },
    });
    const { resolvePmPageScope } = await import("./pm-page-scope");
    const scope = await resolvePmPageScope(
      { role: RoleName.TECHNICIAN, organizationId: "org-a", plantId: "site-a" },
      { organizationId: "org-b", plantId: "site-b" },
    );

    expect(findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "site-a", organizationId: "org-a", active: true, organization: { active: true } },
    }));
    expect(scope.plant.id).toBe("site-a");
    expect(scope.canSelectPlant).toBe(false);
  });

  it("rejects an inactive Site for Site Admin instead of returning a fallback scope", async () => {
    findFirstOrThrow.mockImplementationOnce(async () => {
      throw new Error("No Plant found");
    });
    const { resolvePmPageScope } = await import("./pm-page-scope");

    await expect(resolvePmPageScope({
      role: RoleName.SITE_ADMIN,
      organizationId: "org-a",
      plantId: "site-inactive",
    })).rejects.toThrow("No Plant found");
    expect(findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "site-inactive", organizationId: "org-a", active: true, organization: { active: true } },
    }));
  });

  it("rejects an Organization Admin with no assigned Organization before resolving selectable Sites", async () => {
    const { resolvePmPageScope } = await import("./pm-page-scope");

    await expect(resolvePmPageScope({
      role: RoleName.ORGANIZATION_ADMIN,
    })).rejects.toThrow("Organization Admin account is not assigned to an Organization.");
    expect(organizationFindFirstOrThrow).not.toHaveBeenCalled();
    expect(plantFindMany).not.toHaveBeenCalled();
  });

  it("rejects an Organization Admin whose assigned Organization is inactive", async () => {
    organizationFindFirstOrThrow.mockRejectedValueOnce(new Error("No active Organization found"));
    const { resolvePmPageScope } = await import("./pm-page-scope");

    await expect(resolvePmPageScope({
      role: RoleName.ORGANIZATION_ADMIN,
      organizationId: "org-inactive",
    })).rejects.toThrow("No active Organization found");
    expect(organizationFindFirstOrThrow).toHaveBeenCalledWith({
      where: { id: "org-inactive", active: true },
      select: { id: true },
    });
    expect(plantFindMany).not.toHaveBeenCalled();
  });

  it("preserves an active Organization Admin's selected Site", async () => {
    organizationFindFirstOrThrow.mockResolvedValueOnce({ id: "org-a" });
    organizationFindUnique.mockResolvedValueOnce({ id: "org-a", name: "Org A", slug: "org-a" });
    plantFindMany.mockResolvedValueOnce([
      { id: "site-a", name: "Site A", code: "A" },
      { id: "site-b", name: "Site B", code: "B" },
    ]);
    const { resolvePmPageScope } = await import("./pm-page-scope");

    const scope = await resolvePmPageScope({
      role: RoleName.ORGANIZATION_ADMIN,
      organizationId: "org-a",
      plantId: "site-a",
    }, { plantId: "site-b" });

    expect(scope.organization.id).toBe("org-a");
    expect(scope.plant.id).toBe("site-b");
    expect(scope.canSelectPlant).toBe(true);
  });

  it("rejects Owner scope when there is no active Organization", async () => {
    organizationFindMany.mockResolvedValueOnce([]);
    const { resolvePmPageScope } = await import("./pm-page-scope");

    await expect(resolvePmPageScope({ role: RoleName.ADMIN })).rejects.toThrow(
      "No active Organization is available for PM.",
    );
  });

  it("rejects Owner scope when an active Organization has no active Site", async () => {
    organizationFindMany.mockResolvedValueOnce([{ id: "org-a", name: "Org A", slug: "org-a" }]);
    plantFindMany.mockResolvedValueOnce([]);
    const { resolvePmPageScope } = await import("./pm-page-scope");

    await expect(resolvePmPageScope({ role: RoleName.ADMIN })).rejects.toThrow(
      "No active Site is available for PM.",
    );
  });

  it("replaces an invalid Owner Site selection with a real active Site", async () => {
    organizationFindMany.mockResolvedValueOnce([{ id: "org-a", name: "Org A", slug: "org-a" }]);
    plantFindMany.mockResolvedValueOnce([{ id: "site-a", name: "Site A", code: "A" }]);
    const { resolvePmPageScope } = await import("./pm-page-scope");

    const scope = await resolvePmPageScope(
      { role: RoleName.ADMIN },
      { organizationId: "org-a", plantId: "site-invalid" },
    );
    expect(scope.plant.id).toBe("site-a");
  });

  it.each([RoleName.SITE_ADMIN, RoleName.ENGINEER])(
    "rejects %s when the fixed Site's owning Organization is inactive",
    async (role) => {
      findFirstOrThrow.mockRejectedValueOnce(new Error("No active Plant and Organization found"));
      const { resolvePmPageScope } = await import("./pm-page-scope");
      await expect(resolvePmPageScope({ role, organizationId: "org-a", plantId: "site-a" }))
        .rejects.toThrow("No active Plant and Organization found");
      expect(findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ organization: { active: true } }),
      }));
    },
  );
});
