import { DEFAULT_PLANT_ID } from "./organization-foundation";
import { canUseUserPermission, PermissionKey, type PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

export type PlantScopedUser = {
  organizationId?: string | null;
  plantId?: string | null;
};

export type OperationalScope = {
  organizationId?: string;
  plantId?: string;
};

export function resolveUserPlantId(user: PlantScopedUser) {
  return user.plantId?.trim() || DEFAULT_PLANT_ID;
}

export function resolveUserOperationalPlantId(user: PlantScopedUser & PermissionUserContext) {
  if (canUseUserPermission(user, PermissionKey.VIEW_CROSS_PLANT_DATA)) return undefined;
  return resolveUserPlantId(user);
}

export function buildUserOperationalScope(user: PlantScopedUser & PermissionUserContext): OperationalScope {
  if (user.role === RoleName.ADMIN) return {};

  if (canUseUserPermission(user, PermissionKey.VIEW_CROSS_PLANT_DATA)) {
    if (user.organizationId) return { organizationId: user.organizationId };
    return { plantId: resolveUserPlantId(user) };
  }

  return { plantId: resolveUserPlantId(user) };
}
