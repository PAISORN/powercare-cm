import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { PermissionKey } from "./site-admin-permissions";
import { resolvePermissionPresentation } from "./permission-center-page-model";

describe("permission center presentation", () => {
  it("shows the selected organization override separately from its inherited system value", () => {
    const result = resolvePermissionPresentation({
      mode: "role",
      effectiveRole: RoleName.TECHNICIAN,
      selectedRoleScopeKey: "ORG:org-1",
      effectiveOrganizationId: "org-1",
      roleRows: [
        { scopeKey: "SYSTEM", organizationId: null, permissionKey: PermissionKey.RECEIVE_STOCK, decision: "ALLOW" },
        { scopeKey: "ORG:org-1", organizationId: "org-1", permissionKey: PermissionKey.RECEIVE_STOCK, decision: "DENY" },
      ],
      userRows: [],
    });

    expect(result[PermissionKey.RECEIVE_STOCK]).toEqual({
      overrideDecision: "DENY",
      inheritedDecision: "ALLOW",
      effectiveDecision: "DENY",
    });
  });

  it("shows INHERIT while preserving the effective organization decision for a user", () => {
    const result = resolvePermissionPresentation({
      mode: "user",
      effectiveRole: RoleName.TECHNICIAN,
      selectedRoleScopeKey: "ORG:org-1",
      effectiveOrganizationId: "org-1",
      roleRows: [
        { scopeKey: "SYSTEM", organizationId: null, permissionKey: PermissionKey.RECEIVE_STOCK, decision: "ALLOW" },
        { scopeKey: "ORG:org-1", organizationId: "org-1", permissionKey: PermissionKey.RECEIVE_STOCK, decision: "DENY" },
      ],
      userRows: [],
    });

    expect(result[PermissionKey.RECEIVE_STOCK]).toEqual({
      overrideDecision: "INHERIT",
      inheritedDecision: "DENY",
      effectiveDecision: "DENY",
    });
  });

  it("lets a user override win over organization and system decisions", () => {
    const result = resolvePermissionPresentation({
      mode: "user",
      effectiveRole: RoleName.TECHNICIAN,
      selectedRoleScopeKey: "ORG:org-1",
      effectiveOrganizationId: "org-1",
      roleRows: [
        { scopeKey: "SYSTEM", organizationId: null, permissionKey: PermissionKey.RECEIVE_STOCK, decision: "ALLOW" },
        { scopeKey: "ORG:org-1", organizationId: "org-1", permissionKey: PermissionKey.RECEIVE_STOCK, decision: "DENY" },
      ],
      userRows: [{ permissionKey: PermissionKey.RECEIVE_STOCK, decision: "ALLOW" }],
    });

    expect(result[PermissionKey.RECEIVE_STOCK].effectiveDecision).toBe("ALLOW");
    expect(result[PermissionKey.RECEIVE_STOCK].overrideDecision).toBe("ALLOW");
  });
});
