import { RoleName } from "../cm-work/cm-work-types";
import { canUseUserPermission, PermissionKey, type PermissionUserContext } from "./site-admin-permissions";

export function defaultHomeHref(user: PermissionUserContext) {
  return user.role === RoleName.STORE_OFFICER && canUseUserPermission(user, PermissionKey.VIEW_STORE_DASHBOARD)
    ? "/dashboardstore"
    : "/dashboardcm";
}
