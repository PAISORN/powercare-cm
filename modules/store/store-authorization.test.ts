import { describe, expect, it } from "vitest";
import { PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import {
  assertActorStoreScope,
  requireStorePermission,
} from "./store-authorization";

const scope = { organizationId: "org-a", plantId: "site-a" };

describe("Store authorization", () => {
  it("allows Owner Admin to work across Store scopes", () => {
    expect(() =>
      assertActorStoreScope({ role: RoleName.ADMIN }, scope),
    ).not.toThrow();
  });

  it("rejects users outside the selected Organization or Site", () => {
    expect(() =>
      assertActorStoreScope(
        {
          role: RoleName.STORE_OFFICER,
          organizationId: "org-b",
          plantId: "site-a",
        },
        scope,
      ),
    ).toThrow("Selected Store is outside your Organization.");

    expect(() =>
      assertActorStoreScope(
        {
          role: RoleName.STORE_OFFICER,
          organizationId: "org-a",
          plantId: "site-b",
        },
        scope,
      ),
    ).toThrow("Selected Store is outside your Site.");
  });

  it("uses the effective permission result", () => {
    const actor = {
      id: "officer",
      role: RoleName.STORE_OFFICER,
      rolePermissions: [
        {
          role: RoleName.STORE_OFFICER,
          permissionKey: PermissionKey.MANAGE_STORE,
          allowed: true,
        },
      ],
      userPermissionOverrides: [
        {
          userId: "officer",
          permissionKey: PermissionKey.MANAGE_STORE,
          decision: "DENY" as const,
        },
      ],
    };

    expect(() =>
      requireStorePermission(actor, PermissionKey.MANAGE_STORE),
    ).toThrow("You do not have permission to perform this Store action.");
  });
});
