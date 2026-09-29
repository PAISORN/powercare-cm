import {
  canUseUserPermission,
  PermissionKey,
  type PermissionUserContext,
} from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import type { StoreScope } from "./store-types";

export function requireStorePermission(
  user: PermissionUserContext,
  permission: PermissionKey,
) {
  if (!canUseUserPermission(user, permission)) {
    throw new Error("You do not have permission to perform this Store action.");
  }
}

export function assertActorStoreScope(
  actor: PermissionUserContext,
  scope: Pick<StoreScope, "organizationId" | "plantId">,
) {
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId && actor.organizationId !== scope.organizationId) {
    throw new Error("Selected Store is outside your Organization.");
  }
  if (
    actor.role !== RoleName.ORGANIZATION_ADMIN &&
    actor.plantId !== scope.plantId
  ) {
    throw new Error("Selected Store is outside your Site.");
  }
}
