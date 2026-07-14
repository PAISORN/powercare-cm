import { describe, expect, it } from "vitest";
import {
  canManageEngineerAssignmentSetting,
  canManageLineSettings,
  canManageOrganization,
  canUpdateSystemSettings,
  canViewMemberWorkload,
} from "./permission";
import { RoleName } from "../cm-work/cm-work-types";
import { PermissionKey } from "./site-admin-permissions";

describe("Site Admin permissions", () => {
  it("keeps sensitive plant-level settings behind checkbox permissions", () => {
    expect(RoleName.SITE_ADMIN).toBe("SITE_ADMIN");
    expect(canManageLineSettings(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageOrganization(RoleName.SITE_ADMIN)).toBe(false);
    expect(canViewMemberWorkload(RoleName.SITE_ADMIN)).toBe(true);
    expect(canUpdateSystemSettings(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageEngineerAssignmentSetting(RoleName.SITE_ADMIN)).toBe(false);
    expect(
      canManageEngineerAssignmentSetting({
        id: "plant-admin",
        role: RoleName.SITE_ADMIN,
        plantId: "plant-1",
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_ENGINEER_ASSIGNMENT, enabled: true },
        ],
      }),
    ).toBe(true);
  });
});
