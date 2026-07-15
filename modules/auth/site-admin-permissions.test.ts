import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import {
  SITE_ADMIN_CONFIGURABLE_PERMISSIONS,
  SITE_ADMIN_PERMISSION_OPTIONS,
  PermissionKey,
  canUsePermission,
  permissionDefaultForRole,
} from "./site-admin-permissions";

describe("Site Admin permissions", () => {
  it("lists the configurable permission keys from the matrix", () => {
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.CANCEL_WORK);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.EXPORT_REPORTS);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.MANAGE_USERS_PLANT);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.MANAGE_LINE_SETTINGS);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.ASSIGN_USER_CATEGORIES);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.VIEW_AUDIT_LOG_PLANT);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.MANAGE_STORE);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.MANAGE_SPARE_PARTS);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.VIEW_STORE_STOCK);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.RECEIVE_STOCK);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.ADJUST_STOCK);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.VIEW_STORE_REPORTS);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.ENABLE_PUBLIC_STORE_ISSUE);
    expect(SITE_ADMIN_CONFIGURABLE_PERMISSIONS).toContain(PermissionKey.REQUIRE_PUBLIC_ISSUE_CONTACT);
  });

  it("allows super admin regardless of Site Admin checkbox records", () => {
    expect(canUsePermission({ role: RoleName.ADMIN }, PermissionKey.DELETE_USER, [])).toBe(true);
    expect(canUsePermission({ role: RoleName.ADMIN }, PermissionKey.MANAGE_SYSTEM_SETTINGS, [])).toBe(true);
  });

  it("uses Site Admin checkbox records for configurable permissions", () => {
    const actor = { role: RoleName.SITE_ADMIN, id: "pa-1", plantId: "plant-a" };

    expect(canUsePermission(actor, PermissionKey.EXPORT_REPORTS, [])).toBe(false);
    expect(
      canUsePermission(actor, PermissionKey.EXPORT_REPORTS, [
        { userId: "pa-1", plantId: "plant-a", permissionKey: PermissionKey.EXPORT_REPORTS, enabled: true },
      ]),
    ).toBe(true);
    expect(
      canUsePermission(actor, PermissionKey.EXPORT_REPORTS, [
        { userId: "pa-1", plantId: "plant-b", permissionKey: PermissionKey.EXPORT_REPORTS, enabled: true },
      ]),
    ).toBe(false);
  });

  it("uses Site wording in user-facing configurable permission labels", () => {
    const labels = SITE_ADMIN_PERMISSION_OPTIONS.map((option) => option.label).join(" ");

    expect(labels).toContain("Site");
    expect(labels).not.toContain("Plant");
  });

  it("keeps user-facing configurable permission labels readable", () => {
    const labels = SITE_ADMIN_PERMISSION_OPTIONS.map((option) => option.label).join(" ");

    expect(labels).toContain("กำหนด Category ให้ User");
    expect(labels).toContain("มอบหมายงาน");
    expect(labels).toContain("จัดการ Users เฉพาะ Site");
    expect(labels).not.toContain("à¸");
    expect(labels).not.toContain("Â");
  });

  it("keeps fixed role permissions for engineer, technician, visitor, and public requester", () => {
    expect(permissionDefaultForRole(RoleName.ORGANIZATION_ADMIN, PermissionKey.MANAGE_USERS_ALL_PLANTS)).toBe(true);
    expect(permissionDefaultForRole(RoleName.ORGANIZATION_ADMIN, PermissionKey.MANAGE_SITE_ADMIN_PERMISSION)).toBe(false);
    expect(permissionDefaultForRole(RoleName.ENGINEER, PermissionKey.VIEW_REPORTS)).toBe(true);
    expect(permissionDefaultForRole(RoleName.TECHNICIAN, PermissionKey.CLOSE_WORK)).toBe(false);
    expect(permissionDefaultForRole(RoleName.VISITOR, PermissionKey.VIEW_DASHBOARD)).toBe(true);
    expect(permissionDefaultForRole("PUBLIC_REQUESTER", PermissionKey.CREATE_PUBLIC_REQUEST)).toBe(true);
  });

  it("allows Organization Admin to view Store data without receiving stock", () => {
    expect(permissionDefaultForRole(RoleName.ORGANIZATION_ADMIN, PermissionKey.VIEW_STORE_DASHBOARD)).toBe(true);
    expect(permissionDefaultForRole(RoleName.ORGANIZATION_ADMIN, PermissionKey.VIEW_STORE_STOCK)).toBe(true);
    expect(permissionDefaultForRole(RoleName.ORGANIZATION_ADMIN, PermissionKey.VIEW_STORE_REPORTS)).toBe(true);
    expect(permissionDefaultForRole(RoleName.ORGANIZATION_ADMIN, PermissionKey.RECEIVE_STOCK)).toBe(false);
  });

  it("allows Store Officer store work but blocks CM close and admin user management", () => {
    const user = { id: "store-1", role: RoleName.STORE_OFFICER, plantId: "site-a" };
    const allowedStorePermissions = [
      PermissionKey.LOGIN,
      PermissionKey.VIEW_PROFILE,
      PermissionKey.UPDATE_OWN_PROFILE,
      PermissionKey.VIEW_STORE_DASHBOARD,
      PermissionKey.VIEW_STORE_STOCK,
      PermissionKey.MANAGE_STORE,
      PermissionKey.MANAGE_SPARE_PARTS,
      PermissionKey.RECEIVE_STOCK,
      PermissionKey.ADJUST_STOCK,
      PermissionKey.CREATE_STORE_ISSUE,
      PermissionKey.ISSUE_STOCK,
      PermissionKey.VIEW_STORE_TRACKING,
      PermissionKey.VIEW_STORE_REPORTS,
    ];

    for (const permissionKey of allowedStorePermissions) {
      expect(canUsePermission(user, permissionKey, [])).toBe(true);
    }
    expect(canUsePermission(user, PermissionKey.CLOSE_WORK, [])).toBe(false);
    expect(canUsePermission(user, PermissionKey.MANAGE_USERS_PLANT, [])).toBe(false);
  });
});
