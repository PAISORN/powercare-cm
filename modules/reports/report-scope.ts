import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { PermissionKey, canUseUserPermission } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import { resolveUserPlantId } from "../organization/user-plant-scope";

export type ReportScope = {
  organizationId?: string;
  plantId?: string;
};

export function buildReportScope(user: PermissionUserContext): ReportScope {
  if (user.role === RoleName.ADMIN) return {};

  if (canUseUserPermission(user, PermissionKey.VIEW_CROSS_PLANT_DATA)) {
    if (user.organizationId) return { organizationId: user.organizationId };
    return { plantId: resolveUserPlantId(user) };
  }

  return { plantId: resolveUserPlantId(user) };
}
