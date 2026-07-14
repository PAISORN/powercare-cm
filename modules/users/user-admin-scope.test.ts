import { describe, expect, it } from "vitest";
import { LEGACY_SITE_ADMIN_ROLE, RoleName } from "../cm-work/cm-work-types";
import {
  assertCanManageTargetUser,
  assertManagedUserRole,
  canAssignManagedUserCategories,
  canAssignManagedUserPlant,
  canAssignManagedUserRole,
  canCreateManagedUser,
  canDeactivateManagedUser,
  canDeleteManagedUser,
  getManageableUserWhere,
  resolveManagedUserPlantId,
} from "./user-admin-scope";
import { PermissionKey, type SiteAdminPermissionRecord } from "../auth/site-admin-permissions";

const admin = { id: "admin", role: RoleName.ADMIN, plantId: null };
const orgAdmin = { id: "org-admin", role: RoleName.ORGANIZATION_ADMIN, organizationId: "org-a", plantId: null };
const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-a" };
const plantAdminWith = (...permissionKeys: string[]) => ({
  ...plantAdmin,
  siteAdminPermissions: permissionKeys.map(
    (permissionKey): SiteAdminPermissionRecord => ({
      userId: "plant-admin",
      plantId: "plant-a",
      permissionKey,
      enabled: true,
    }),
  ),
});

describe("user admin scope", () => {
  it("lets owner admin manage users across plants", () => {
    expect(getManageableUserWhere(admin)).toEqual({});
    expect(resolveManagedUserPlantId(admin, "plant-b")).toBe("plant-b");
    expect(() => assertManagedUserRole(admin, RoleName.ADMIN)).toThrow("Owner Admin is a single fixed account");
    expect(assertManagedUserRole(admin, RoleName.ORGANIZATION_ADMIN)).toBe(RoleName.ORGANIZATION_ADMIN);
    expect(() => assertCanManageTargetUser(admin, { id: "other-admin", role: RoleName.ADMIN })).toThrow(
      "Owner Admin is a single fixed account",
    );
  });

  it("scopes site admin users to their own plant", () => {
    expect(getManageableUserWhere(plantAdmin)).toEqual({
      plantId: "plant-a",
      role: { notIn: [RoleName.ADMIN, RoleName.SITE_ADMIN, LEGACY_SITE_ADMIN_ROLE] },
    });
    expect(resolveManagedUserPlantId(plantAdmin, "plant-b")).toBe("plant-a");
  });

  it("scopes organization admin users to their own organization and lets them manage site admins", () => {
    expect(getManageableUserWhere(orgAdmin)).toEqual({
      organizationId: "org-a",
      role: { notIn: [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN] },
    });
    expect(resolveManagedUserPlantId(orgAdmin, "plant-b")).toBe("plant-b");
    expect(assertManagedUserRole(orgAdmin, RoleName.SITE_ADMIN)).toBe(RoleName.SITE_ADMIN);
    expect(() => assertManagedUserRole(orgAdmin, RoleName.ADMIN)).toThrow("Organization Admin cannot manage owner roles");
    expect(() => assertManagedUserRole(orgAdmin, RoleName.ORGANIZATION_ADMIN)).toThrow("Organization Admin cannot manage owner roles");
    expect(() =>
      assertCanManageTargetUser(orgAdmin, { id: "site-admin", role: RoleName.SITE_ADMIN, organizationId: "org-a", plantId: "plant-a" }),
    ).not.toThrow();
    expect(() =>
      assertCanManageTargetUser(orgAdmin, { id: "other", role: RoleName.ENGINEER, organizationId: "org-b", plantId: "plant-b" }),
    ).toThrow("Organization Admin can only manage users in their organization");
  });

  it("limits Site Admin to non-admin roles", () => {
    expect(assertManagedUserRole(plantAdmin, RoleName.ENGINEER)).toBe(RoleName.ENGINEER);
    expect(() => assertManagedUserRole(plantAdmin, RoleName.ADMIN)).toThrow("Site Admin cannot manage admin roles");
    expect(() => assertManagedUserRole(plantAdmin, RoleName.SITE_ADMIN)).toThrow("Site Admin cannot manage admin roles");
  });

  it("prevents Site Admin from editing users outside their plant or admin roles", () => {
    expect(() =>
      assertCanManageTargetUser(plantAdmin, { id: "engineer", role: RoleName.ENGINEER, plantId: "plant-a" }),
    ).not.toThrow();
    expect(() =>
      assertCanManageTargetUser(plantAdmin, { id: "other", role: RoleName.ENGINEER, plantId: "plant-b" }),
    ).toThrow("Site Admin can only manage users in their plant");
    expect(() =>
      assertCanManageTargetUser(plantAdmin, { id: "owner", role: RoleName.ADMIN, plantId: "plant-a" }),
    ).toThrow("Site Admin cannot manage admin roles");
  });

  it("keeps Organization Admin and Site Admin boundaries ready for future Store records", () => {
    expect(() =>
      assertCanManageTargetUser(orgAdmin, {
        id: "store-user-own-org",
        role: RoleName.TECHNICIAN,
        organizationId: "org-a",
        plantId: "plant-a",
      }),
    ).not.toThrow();
    expect(() =>
      assertCanManageTargetUser(orgAdmin, {
        id: "store-user-other-org",
        role: RoleName.TECHNICIAN,
        organizationId: "org-b",
        plantId: "plant-b",
      }),
    ).toThrow("Organization Admin can only manage users in their organization");
    expect(() =>
      assertCanManageTargetUser(plantAdmin, {
        id: "store-user-other-site",
        role: RoleName.TECHNICIAN,
        organizationId: "org-a",
        plantId: "plant-b",
      }),
    ).toThrow("Site Admin can only manage users in their plant");
  });

  it("requires checkbox permissions for Site Admin user management actions", () => {
    expect(canCreateManagedUser(plantAdmin)).toBe(false);
    expect(canAssignManagedUserRole(plantAdmin)).toBe(false);
    expect(canAssignManagedUserPlant(plantAdmin)).toBe(false);
    expect(canAssignManagedUserCategories(plantAdmin)).toBe(false);
    expect(canDeactivateManagedUser(plantAdmin)).toBe(false);
    expect(canDeleteManagedUser(plantAdmin)).toBe(false);

    expect(canCreateManagedUser(plantAdminWith(PermissionKey.CREATE_USER))).toBe(true);
    expect(canAssignManagedUserRole(plantAdminWith(PermissionKey.ASSIGN_USER_ROLE))).toBe(true);
    expect(canAssignManagedUserPlant(plantAdminWith(PermissionKey.ASSIGN_USER_PLANT))).toBe(true);
    expect(canAssignManagedUserCategories(plantAdminWith(PermissionKey.ASSIGN_USER_CATEGORIES))).toBe(true);
    expect(canDeactivateManagedUser(plantAdminWith(PermissionKey.DEACTIVATE_USER))).toBe(true);
    expect(canDeleteManagedUser(plantAdminWith(PermissionKey.DELETE_USER))).toBe(true);
  });

  it("lets owner admin perform all user management actions", () => {
    expect(canCreateManagedUser(admin)).toBe(true);
    expect(canAssignManagedUserRole(admin)).toBe(true);
    expect(canAssignManagedUserPlant(admin)).toBe(true);
    expect(canAssignManagedUserCategories(admin)).toBe(true);
    expect(canDeactivateManagedUser(admin)).toBe(true);
    expect(canDeleteManagedUser(admin)).toBe(true);
  });
});
