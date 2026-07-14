import { isSiteAdminRole, LEGACY_SITE_ADMIN_ROLE, RoleName, type RoleName as RoleNameValue } from "../cm-work/cm-work-types";
import { DEFAULT_ORGANIZATION_ID, DEFAULT_PLANT_ID } from "../organization/organization-foundation";
import { canUseUserPermission, PermissionKey, type SiteAdminPermissionRecord } from "../auth/site-admin-permissions";

type UserManager = {
  id: string;
  role: string;
  organizationId?: string | null;
  plantId?: string | null;
  siteAdminPermissions?: SiteAdminPermissionRecord[];
};

type TargetUser = {
  id: string;
  role: string;
  organizationId?: string | null;
  plantId?: string | null;
};

const ownerRoles = new Set<string>([RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN]);
const adminRoles = new Set<string>([RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN, RoleName.SITE_ADMIN, LEGACY_SITE_ADMIN_ROLE]);

export function canManageUsers(manager: string | UserManager) {
  if (typeof manager === "string") return ownerRoles.has(manager) || isSiteAdminRole(manager);
  return canUseUserPermission(manager, PermissionKey.MANAGE_USERS_ALL_PLANTS) || canUseUserPermission(manager, PermissionKey.MANAGE_USERS_PLANT);
}

function canManageUserPermission(manager: string | UserManager, permissionKey: PermissionKey) {
  if (typeof manager === "string") return ownerRoles.has(manager);
  return canUseUserPermission(manager, permissionKey);
}

export function canCreateManagedUser(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.CREATE_USER);
}

export function canUpdateManagedUser(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.UPDATE_USER);
}

export function canResetManagedUserPassword(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.RESET_USER_PASSWORD);
}

export function canAssignManagedUserRole(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.ASSIGN_USER_ROLE);
}

export function canAssignManagedUserPlant(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.ASSIGN_USER_PLANT);
}

export function canAssignManagedUserCategories(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.ASSIGN_USER_CATEGORIES);
}

export function canDeactivateManagedUser(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.DEACTIVATE_USER);
}

export function canDeleteManagedUser(manager: string | UserManager) {
  return canManageUserPermission(manager, PermissionKey.DELETE_USER);
}

export function getManagedPlantId(manager: UserManager) {
  return manager.plantId ?? DEFAULT_PLANT_ID;
}

export function getManageableUserWhere(manager: UserManager) {
  if (manager.role === RoleName.ADMIN) return {};
  if (manager.role === RoleName.ORGANIZATION_ADMIN) {
    return {
      organizationId: manager.organizationId ?? DEFAULT_ORGANIZATION_ID,
      role: { notIn: [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN] },
    };
  }
  if (isSiteAdminRole(manager.role)) {
    return {
      plantId: getManagedPlantId(manager),
      role: { notIn: [RoleName.ADMIN, RoleName.SITE_ADMIN, LEGACY_SITE_ADMIN_ROLE] },
    };
  }
  throw new Error("Only admin can manage users");
}

export function resolveManagedUserPlantId(manager: UserManager, requestedPlantId?: string | null) {
  if (manager.role === RoleName.ADMIN) return requestedPlantId || null;
  if (manager.role === RoleName.ORGANIZATION_ADMIN) return requestedPlantId || null;
  if (isSiteAdminRole(manager.role)) return getManagedPlantId(manager);
  throw new Error("Only admin can manage users");
}

export function assertManagedUserRole(manager: UserManager, requestedRole: RoleNameValue) {
  if (manager.role === RoleName.ADMIN) {
    if (requestedRole === RoleName.ADMIN) throw new Error("Owner Admin is a single fixed account");
    return requestedRole;
  }
  if (manager.role === RoleName.ORGANIZATION_ADMIN) {
    if (ownerRoles.has(requestedRole)) throw new Error("Organization Admin cannot manage owner roles");
    return requestedRole;
  }
  if (!isSiteAdminRole(manager.role)) throw new Error("Only admin can manage users");
  if (adminRoles.has(requestedRole)) throw new Error("Site Admin cannot manage admin roles");
  return requestedRole;
}

export function assertCanManageTargetUser(manager: UserManager, target: TargetUser) {
  if (manager.role === RoleName.ADMIN) {
    if (target.role === RoleName.ADMIN && target.id !== manager.id) throw new Error("Owner Admin is a single fixed account");
    return;
  }
  if (manager.role === RoleName.ORGANIZATION_ADMIN) {
    if (ownerRoles.has(target.role)) throw new Error("Organization Admin cannot manage owner roles");
    if ((target.organizationId ?? manager.organizationId) !== manager.organizationId) {
      throw new Error("Organization Admin can only manage users in their organization");
    }
    return;
  }
  if (!isSiteAdminRole(manager.role)) throw new Error("Only admin can manage users");
  if (adminRoles.has(target.role)) throw new Error("Site Admin cannot manage admin roles");
  if ((target.plantId ?? DEFAULT_PLANT_ID) !== getManagedPlantId(manager)) {
    throw new Error("Site Admin can only manage users in their plant");
  }
}
