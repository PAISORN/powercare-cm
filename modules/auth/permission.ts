import { isSiteAdminRole, RoleName, WorkStatus, type Actor, type WorkAccessContext } from "../cm-work/cm-work-types";
import { DEFAULT_PLANT_ID } from "../organization/organization-foundation";
import { canUseUserPermission, PermissionKey, type PermissionUserContext } from "./site-admin-permissions";

function sameCategory(actor: Actor, work: WorkAccessContext) {
  return actor.categoryId === work.categoryId || Boolean(actor.categoryIds?.includes(work.categoryId));
}

function normalizedPlantId(value?: string | null) {
  return value?.trim() || DEFAULT_PLANT_ID;
}

function samePlant(actor: Actor, work: WorkAccessContext) {
  if (actor.role === RoleName.ADMIN) return true;
  if (actor.role === RoleName.ORGANIZATION_ADMIN) return true;
  if (work.plantId === undefined) return true;
  return normalizedPlantId(actor.plantId) === normalizedPlantId(work.plantId);
}

function isClaimableStatus(status: string) {
  return status === WorkStatus.NEW || status === WorkStatus.WAITING_TO_CLAIM || status === WorkStatus.RETURNED_FOR_CORRECTION;
}

export function canClaimWork(actor: Actor, work: WorkAccessContext) {
  if (!samePlant(actor, work)) return false;
  if (work.claimantId) return false;
  if (!isClaimableStatus(work.status)) return false;
  if (actor.role === RoleName.ADMIN || actor.role === RoleName.ORGANIZATION_ADMIN || isSiteAdminRole(actor.role)) return true;
  if (actor.role === RoleName.ENGINEER || actor.role === RoleName.TECHNICIAN) return sameCategory(actor, work);
  return false;
}

export function canAssignWork(actor: Actor, work: WorkAccessContext, engineerAssignmentEnabled: boolean) {
  if (!samePlant(actor, work)) return false;
  if (work.claimantId || !isClaimableStatus(work.status)) return false;
  if (actor.role === RoleName.ADMIN || actor.role === RoleName.ORGANIZATION_ADMIN) return true;
  if (isSiteAdminRole(actor.role)) return canUseUserPermission(actor, PermissionKey.ASSIGN_WORK);
  return actor.role === RoleName.ENGINEER && engineerAssignmentEnabled && sameCategory(actor, work);
}

export function canCancelWork(actor: Actor, work: WorkAccessContext) {
  if (!samePlant(actor, work)) return false;
  if (work.status === WorkStatus.CLOSED || work.status === WorkStatus.CANCELED) return false;
  if (actor.role === RoleName.ADMIN || actor.role === RoleName.ORGANIZATION_ADMIN) return true;
  if (isSiteAdminRole(actor.role)) return canUseUserPermission(actor, PermissionKey.CANCEL_WORK);
  return actor.role === RoleName.ENGINEER && sameCategory(actor, work);
}

export function canCloseWork(actor: Actor, work: WorkAccessContext) {
  if (!samePlant(actor, work)) return false;
  if (work.status !== WorkStatus.WAITING_TO_CLOSE && work.status !== WorkStatus.BACKLOG_SHUTDOWN) return false;
  if (actor.role === RoleName.ADMIN || actor.role === RoleName.ORGANIZATION_ADMIN) return true;
  if (isSiteAdminRole(actor.role)) return canUseUserPermission(actor, PermissionKey.CLOSE_WORK);
  return actor.role === RoleName.ENGINEER && sameCategory(actor, work);
}

export function canReturnWork(actor: Actor, work: WorkAccessContext) {
  return canCloseWork(actor, work);
}

export function canPrintCompletionDocument(actor: Actor, work: WorkAccessContext) {
  if (!samePlant(actor, work)) return false;
  return actor.role !== RoleName.VISITOR && Boolean(actor.id) && work.status === WorkStatus.CLOSED;
}

function roleOf(input: string | PermissionUserContext) {
  return typeof input === "string" ? input : input.role;
}

function canUse(input: string | PermissionUserContext, permissionKey: PermissionKey, legacyRoles: string[]) {
  if (typeof input === "string") return legacyRoles.includes(input) || (legacyRoles.includes(RoleName.SITE_ADMIN) && isSiteAdminRole(input));
  return canUseUserPermission(input, permissionKey);
}

export function canViewMemberWorkload(input: string | PermissionUserContext) {
  const role = roleOf(input);
  return role === RoleName.ADMIN || role === RoleName.ORGANIZATION_ADMIN || isSiteAdminRole(role) || role === RoleName.ENGINEER;
}

export function canViewReports(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.VIEW_REPORTS, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN, RoleName.SITE_ADMIN, RoleName.ENGINEER]);
}

export function canExportReports(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.EXPORT_REPORTS, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN, RoleName.ENGINEER]);
}

export function canUpdateSystemSettings(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_SYSTEM_SETTINGS, [RoleName.ADMIN]);
}

export function canManageEngineerAssignmentSetting(input: string | PermissionUserContext) {
  if (typeof input === "string") return input === RoleName.ADMIN || input === RoleName.ORGANIZATION_ADMIN;
  return canUseUserPermission(input, PermissionKey.MANAGE_SYSTEM_SETTINGS) || canUseUserPermission(input, PermissionKey.MANAGE_ENGINEER_ASSIGNMENT);
}

export function canManageSlaDueDate(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_SLA_DUE_DATE, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN]);
}

export function canManageLineSettings(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_LINE_SETTINGS, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN]);
}

export function canTestLineMessaging(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.TEST_LINE_MESSAGING, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN]);
}

export function canManageOrganization(input: string | PermissionUserContext) {
  return canManageCompanyOrganization(input);
}

export function canManageCompanyOrganization(input: string | PermissionUserContext) {
  if (typeof input === "string") return input === RoleName.ADMIN || input === RoleName.ORGANIZATION_ADMIN;
  return canUseUserPermission(input, PermissionKey.MANAGE_COMPANY_ORGANIZATION);
}

export function canManagePlantProfile(input: string | PermissionUserContext) {
  if (typeof input === "string") return input === RoleName.ADMIN || input === RoleName.ORGANIZATION_ADMIN;
  return canUseUserPermission(input, PermissionKey.MANAGE_PLANT_PROFILE);
}

export function canManageSites(input: string | PermissionUserContext) {
  return roleOf(input) === RoleName.ADMIN || roleOf(input) === RoleName.ORGANIZATION_ADMIN;
}

export function canManageAnnouncements(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_ANNOUNCEMENTS, [RoleName.ADMIN]);
}

export function canManageFeedback(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.VIEW_FEEDBACK_ALL_PLANTS, [RoleName.ADMIN]);
}

export function canManageCategory(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_CATEGORY, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN]);
}

export function canManageZone(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_ZONE, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN]);
}

export function canManageQrCode(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_QR_CODE, [RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN]);
}

export function canViewPlantAuditLog(input: string | PermissionUserContext) {
  if (typeof input === "string") return input === RoleName.ADMIN || input === RoleName.ORGANIZATION_ADMIN;
  return canUseUserPermission(input, PermissionKey.VIEW_AUDIT_LOG_ALL_PLANTS) || canUseUserPermission(input, PermissionKey.VIEW_AUDIT_LOG_PLANT);
}

export function canManageSiteAdminPermissions(input: string | PermissionUserContext) {
  return canUse(input, PermissionKey.MANAGE_SITE_ADMIN_PERMISSION, [RoleName.ADMIN]);
}
