import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { PermissionKey } from "./site-admin-permissions";
import {
  activePermissionPlantWhere,
  activePermissionTargetWhere,
  buildUserPermissionOverrideRows,
  editableUserPermissionKeys,
} from "./permission-center-policy";

describe("individual Owner Admin permission policy", () => {
  it.each(["ALLOW", "DENY"] as const)("persists an individual %s for PM execution", (decision) => {
    expect(buildUserPermissionOverrideRows({
      role: RoleName.ADMIN,
      userId: "owner-target",
      grantedById: "owner-actor",
      decisionFor: (key) => key === PermissionKey.EXECUTE_PM_WORK ? decision : "ALLOW",
    })).toEqual([{
      userId: "owner-target",
      permissionKey: PermissionKey.EXECUTE_PM_WORK,
      decision,
      grantedById: "owner-actor",
    }]);
  });

  it("restricts an Owner target to PM execution even if unrelated fields are submitted", () => {
    const keys = editableUserPermissionKeys(RoleName.ADMIN);
    const rows = buildUserPermissionOverrideRows({
      role: RoleName.ADMIN,
      userId: "owner-target",
      grantedById: "owner-actor",
      decisionFor: () => "ALLOW",
    });

    expect(keys).toEqual([PermissionKey.EXECUTE_PM_WORK]);
    expect(rows).toHaveLength(1);
    expect(rows.some((row) => row.permissionKey === PermissionKey.MANAGE_PM_PLANS)).toBe(false);
  });

  it("limits deletion to PM execution so unrelated Owner overrides are preserved", () => {
    const existing = [
      { permissionKey: PermissionKey.EXECUTE_PM_WORK, decision: "DENY" },
      { permissionKey: PermissionKey.VIEW_PM, decision: "ALLOW" },
    ];
    const deleteKeys = new Set(editableUserPermissionKeys(RoleName.ADMIN));

    expect(existing.filter((row) => !deleteKeys.has(row.permissionKey))).toEqual([
      { permissionKey: PermissionKey.VIEW_PM, decision: "ALLOW" },
    ]);
  });

  it("builds override rows only for permission switches changed in this submission", () => {
    const rows = buildUserPermissionOverrideRows({
      role: RoleName.ENGINEER,
      userId: "engineer-target",
      grantedById: "owner-actor",
      decisionFor: () => "DENY",
      permissionKeys: [PermissionKey.VIEW_MY_ACTIVITIES],
    });

    expect(rows).toEqual([{
      userId: "engineer-target",
      permissionKey: PermissionKey.VIEW_MY_ACTIVITIES,
      decision: "DENY",
      grantedById: "owner-actor",
    }]);
  });
});

describe("Permission Center active target policy", () => {
  it("keeps Owner targets plantless while restricting non-Owners to the selected active Site and Organization", () => {
    expect(activePermissionTargetWhere("target", "site-a")).toEqual({
      id: "target",
      active: true,
      OR: [
        { role: RoleName.ADMIN },
        {
          plantId: "site-a",
          role: { not: RoleName.ADMIN },
          plant: { active: true, organization: { active: true } },
        },
      ],
    });
  });

  it("lists only active Sites owned by active Organizations", () => {
    expect(activePermissionPlantWhere).toEqual({
      active: true,
      organization: { active: true },
    });
  });

  it("omits the user id only for the active target listing query", () => {
    expect(activePermissionTargetWhere(undefined, "site-a")).not.toHaveProperty("id");
  });
});
