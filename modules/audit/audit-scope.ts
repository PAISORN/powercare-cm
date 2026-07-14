import { canUseUserPermission, PermissionKey, type PermissionUserContext } from "../auth/site-admin-permissions";
import { resolveUserPlantId } from "../organization/user-plant-scope";

export function buildAuditEventScopeWhere(user: PermissionUserContext) {
  if (canUseUserPermission(user, PermissionKey.VIEW_AUDIT_LOG_ALL_PLANTS)) return {};
  return { plantId: resolveUserPlantId(user) };
}
