import { db } from "../../lib/db";
import { canViewPm } from "../auth/permission";
import { canUseUserPermission, PermissionKey, type PermissionUserContext } from "../auth/site-admin-permissions";
import { createRepairRequest } from "../cm-work/cm-work-service";
import { RoleName } from "../cm-work/cm-work-types";
import type { PmWorkScope } from "./pm-work-service";
import { persistPmLinkedCmNotification } from "./pm-notification-service";

export const pmCmSubmissionKey = (workId: string) => `pm-work:${workId}:cm`;

function assertScope(actor: PermissionUserContext, scope: PmWorkScope) {
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId) throw new Error("PM work scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) throw new Error("PM work scope is outside your Site");
}

export async function listPmCmOptions(actor: PermissionUserContext, scope: PmWorkScope) {
  if (!canViewPm(actor)) throw new Error("You cannot view PM work");
  if (!canUseUserPermission(actor, PermissionKey.CREATE_INTERNAL_REQUEST)) throw new Error("You cannot create CM work");
  assertScope(actor, scope);
  const [categories, zones] = await Promise.all([
    db.category.findMany({ where: { organizationId: scope.organizationId, plantId: scope.plantId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.zone.findMany({ where: { plantId: scope.plantId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, zones };
}

export async function createCmFromAbnormalPm(
  actor: PermissionUserContext & { fullName?: string | null; department?: string | null },
  input: PmWorkScope & { workId: string; categoryId: string; zoneId: string; pmWorkUpdatedAt: Date },
) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  if (!actor.id) throw new Error("Authenticated user is required");
  if (!canViewPm(actor)) throw new Error("You cannot view PM work");
  if (!canUseUserPermission(actor, PermissionKey.CREATE_INTERNAL_REQUEST)) throw new Error("You cannot create CM work");
  assertScope(actor, scope);
  if (!input.categoryId.trim()) throw new Error("Category is required");
  if (!input.zoneId.trim()) throw new Error("Zone is required");

  const cm = await createRepairRequest({
    submissionKey: pmCmSubmissionKey(input.workId),
    internalPmOrigin: { ...scope, actorId: actor.id, pmWorkId: input.workId, pmWorkUpdatedAt: input.pmWorkUpdatedAt, persistLinkedNotification: (tx, cm) => persistPmLinkedCmNotification(tx, input.workId, cm.number) },
    requesterName: actor.fullName?.trim() || "PM User",
    requesterDepartment: actor.department?.trim() || "Maintenance",
    categoryId: input.categoryId,
    zoneId: input.zoneId,
    machineName: "PM Asset",
    problemTitle: "ผล PM ผิดปกติ",
    problemDetail: "สร้างจากผล PM",
    urgency: "NORMAL",
  });
  return cm;
}
