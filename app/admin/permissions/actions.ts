"use server";

import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { PermissionKey, canUsePermission, canUseUserPermission } from "../../../modules/auth/site-admin-permissions";
import { activePermissionTargetWhere, buildUserPermissionOverrideRows, editableUserPermissionKeys } from "../../../modules/auth/permission-center-policy";
import { changedPermissionKeys, permissionKeys, permissionRoles } from "../../../modules/auth/permission-center-page-model";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { INVENTORY_ITEM_KINDS, normalizeInventoryScopeKinds } from "../../../modules/store/inventory-user-scope";

const decisions = new Set(["INHERIT", "ALLOW", "DENY"]);
export async function saveRolePermissions(formData: FormData) {
  "use server";
  const actor = await requireOwner();
  const organizationId = String(formData.get("organizationId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!permissionRoles.includes(role as (typeof permissionRoles)[number])) redirect("/admin/permissions?error=invalid-role");
  const isOwnerRole = role === RoleName.ADMIN;
  if (!isOwnerRole && !organizationId) redirect("/admin/permissions?error=invalid-role");
  if (!isOwnerRole) await db.organization.findFirstOrThrow({ where: { id: organizationId, active: true } });
  const scopeKey = isOwnerRole ? "SYSTEM" : `ORG:${organizationId}`;
  const editablePermissionKeys = isOwnerRole ? [PermissionKey.EXECUTE_PM_WORK] : permissionKeys;
  const changedKeys = changedPermissionKeys(formData, editablePermissionKeys);
  if (!changedKeys.length) redirect(`/admin/permissions?mode=role&organizationId=${organizationId}&role=${role}&saved=1`);
  const before = await db.rolePermissionOverride.findMany({ where: { scopeKey, role, permissionKey: { in: changedKeys } } });
  await db.$transaction(async (tx) => {
    await tx.rolePermissionOverride.deleteMany({ where: { scopeKey, role, permissionKey: { in: changedKeys } } });
    const rows = changedKeys.flatMap((permissionKey) => {
      const decision = String(formData.get(`permission:${permissionKey}`) ?? "INHERIT");
      return decision !== "INHERIT" && decisions.has(decision)
        ? [{ scopeKey, organizationId: isOwnerRole ? null : organizationId, role, permissionKey, decision, grantedById: actor.id }]
        : [];
    });
    if (rows.length) await tx.rolePermissionOverride.createMany({ data: rows });
  });
  await recordAudit({
    actorId: actor.id,
    organizationId: isOwnerRole ? undefined : organizationId,
    entityType: "RolePermissionOverride",
    entityId: `${scopeKey}:${role}`,
    action: "UPDATE_ROLE_PERMISSIONS",
    before,
    after: changedKeys.map((permissionKey) => ({
      permissionKey,
      decision: String(formData.get(`permission:${permissionKey}`) ?? "INHERIT"),
    })),
  });
  redirect(`/admin/permissions?mode=role&organizationId=${organizationId}&role=${role}&saved=1`);
}

export async function saveUserPermissions(formData: FormData) {
  "use server";
  const actor = await requireOwner();
  const userId = String(formData.get("userId") ?? "");
  const plantId = String(formData.get("plantId") ?? "");
  const target = await db.user.findFirstOrThrow({
    where: activePermissionTargetWhere(userId, plantId),
    include: { siteAdminPermissions: true },
  });
  const isOwnerTarget = target.role === RoleName.ADMIN;
  const editablePermissionKeys = editableUserPermissionKeys(target.role);
  const changedKeys = changedPermissionKeys(formData, editablePermissionKeys);
  const responsibilityKinds = normalizeInventoryScopeKinds(formData.getAll("inventoryResponsibility"));
  const approvalKinds = normalizeInventoryScopeKinds(formData.getAll("inventoryApproval"));
  const [existingUserOverrides, roleOverrides, beforeScopes] = await Promise.all([
    db.userPermissionOverride.findMany({ where: { userId } }),
    db.rolePermissionOverride.findMany({
      where: { OR: [{ scopeKey: "SYSTEM" }, { organizationId: target.organizationId ?? undefined }] },
    }),
    db.userInventoryScope.findMany({ where: { userId } }),
  ]);
  const newOverrideRows = buildUserPermissionOverrideRows({
    role: target.role,
    userId,
    grantedById: actor.id,
    decisionFor: (permissionKey) => String(formData.get(`permission:${permissionKey}`) ?? "INHERIT"),
    permissionKeys: changedKeys,
  });
  const changedKeySet = new Set(changedKeys);
  const postSaveUserOverrides = [
    ...existingUserOverrides.filter((row) => !changedKeySet.has(row.permissionKey as PermissionKey)),
    ...newOverrideRows,
  ];
  const effectiveAllowed = (permissionKey: PermissionKey) => canUsePermission(
    target,
    permissionKey,
    target.siteAdminPermissions,
    roleOverrides,
    postSaveUserOverrides,
  );
  const approvalAllowed = effectiveAllowed(PermissionKey.APPROVE_STORE_ISSUE);
  const issueAllowed = effectiveAllowed(PermissionKey.ISSUE_STOCK);
  if (!isOwnerTarget && target.role === RoleName.STORE_OFFICER && responsibilityKinds.length === 0) {
    redirect(`/admin/permissions?mode=user&plantId=${plantId}&userId=${userId}&error=responsibility-required`);
  }
  if (!isOwnerTarget && approvalAllowed && approvalKinds.length === 0) {
    redirect(`/admin/permissions?mode=user&plantId=${plantId}&userId=${userId}&error=approval-required`);
  }
  if (!isOwnerTarget) {
    await assertPendingInventoryCoverage({ userId, plantId, responsibilityKinds, approvalKinds, approvalAllowed, issueAllowed });
  }
  const before = existingUserOverrides.filter((row) => changedKeySet.has(row.permissionKey as PermissionKey));
  const scopeRows = isOwnerTarget ? [] : INVENTORY_ITEM_KINDS.flatMap((itemKind) => {
    const responsibilityEnabled = responsibilityKinds.includes(itemKind);
    const approvalEnabled = approvalKinds.includes(itemKind);
    return responsibilityEnabled || approvalEnabled ? [{ userId, itemKind, responsibilityEnabled, approvalEnabled }] : [];
  });
  await db.$transaction(async (tx) => {
    if (changedKeys.length) await tx.userPermissionOverride.deleteMany({ where: { userId, permissionKey: { in: changedKeys } } });
    if (newOverrideRows.length) await tx.userPermissionOverride.createMany({ data: newOverrideRows });
    if (!isOwnerTarget) {
      await tx.userInventoryScope.deleteMany({ where: { userId } });
      if (scopeRows.length) await tx.userInventoryScope.createMany({ data: scopeRows });
    }
  });
  const scopeChanged = !isOwnerTarget && inventoryScopeSignature(beforeScopes) !== inventoryScopeSignature(scopeRows);
  if (changedKeys.length || scopeChanged) {
    await recordAudit({
      actorId: actor.id,
      organizationId: target.organizationId ?? undefined,
      entityType: "UserPermissionOverride",
      entityId: userId,
      action: "UPDATE_USER_PERMISSIONS",
      before: { permissions: before, inventoryScopes: beforeScopes },
      after: {
        permissions: changedKeys.map((permissionKey) => ({
          permissionKey,
          decision: String(formData.get(`permission:${permissionKey}`) ?? "INHERIT"),
        })),
        inventoryScopes: scopeRows,
      },
    });
  }
  redirect(`/admin/permissions?mode=user&plantId=${plantId}&userId=${userId}&saved=1`);
}
function inventoryScopeSignature(rows: readonly {
  itemKind: string;
  responsibilityEnabled: boolean;
  approvalEnabled: boolean;
}[]) {
  return JSON.stringify(rows.map((row) => ({
    itemKind: row.itemKind,
    responsibilityEnabled: row.responsibilityEnabled,
    approvalEnabled: row.approvalEnabled,
  })).sort((left, right) => left.itemKind.localeCompare(right.itemKind)));
}
async function requireOwner() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboardcm");
  return user;
}
async function assertPendingInventoryCoverage(input: {
  userId: string;
  plantId: string;
  responsibilityKinds: string[];
  approvalKinds: string[];
  approvalAllowed: boolean;
  issueAllowed: boolean;
}) {
  const pending = await db.sparePartIssue.findMany({
    where: { plantId: input.plantId, status: { in: ["WAITING_ENGINEER_APPROVAL", "WAITING_STORE_ISSUE", "PARTIALLY_ISSUED"] } },
    select: { itemKind: true, status: true },
  });
  if (!pending.length) return;
  const plant = await db.plant.findUniqueOrThrow({ where: { id: input.plantId }, select: { organizationId: true } });
  const [users, roleOverrides] = await Promise.all([
    db.user.findMany({
      where: { plantId: input.plantId, active: true, id: { not: input.userId } },
      include: { inventoryScopes: true, userPermissionOverrides: true, siteAdminPermissions: true },
    }),
    db.rolePermissionOverride.findMany({ where: { OR: [{ scopeKey: "SYSTEM" }, { organizationId: plant.organizationId }] } }),
  ]);
  const coveredByOther = (kind: string, mode: "approval" | "issue") => users.some((candidate) => {
    const scoped = candidate.inventoryScopes.some((scope) => scope.itemKind === kind && (mode === "approval" ? scope.approvalEnabled : scope.responsibilityEnabled));
    const permission = mode === "approval" ? PermissionKey.APPROVE_STORE_ISSUE : PermissionKey.ISSUE_STOCK;
    return scoped && canUseUserPermission({ ...candidate, rolePermissionOverrides: roleOverrides }, permission);
  });
  for (const kind of INVENTORY_ITEM_KINDS) {
    const needsApproval = pending.some((issue) => issue.itemKind === kind && issue.status === "WAITING_ENGINEER_APPROVAL");
    const targetApproves = input.approvalAllowed && input.approvalKinds.includes(kind);
    if (needsApproval && !targetApproves && !coveredByOther(kind, "approval")) throw new Error(`Cannot remove the last ${kind} approver while requests are pending.`);
    const needsIssue = pending.some((issue) => issue.itemKind === kind && ["WAITING_STORE_ISSUE", "PARTIALLY_ISSUED"].includes(issue.status));
    const targetIssues = input.issueAllowed && input.responsibilityKinds.includes(kind);
    if (needsIssue && !targetIssues && !coveredByOther(kind, "issue")) throw new Error(`Cannot remove the last ${kind} issuer while requests are pending.`);
  }
}
