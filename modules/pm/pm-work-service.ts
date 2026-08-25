import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { canExecutePmWork, canManagePmPlans, canViewPm } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import { PmAssigneeRole, PmPlanStatus, PmResult, PmWorkStatus, type PmResult as PmResultValue } from "./pm-types";
import { notifyPmAssignment } from "./pm-notification-service";

export type PmWorkScope = { organizationId: string; plantId: string };
type Tx = Prisma.TransactionClient;

function actorId(actor: PermissionUserContext) {
  if (!actor.id) throw new Error("Authenticated user is required");
  return actor.id;
}

function assertScope(actor: PermissionUserContext, scope: PmWorkScope) {
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId) throw new Error("PM work scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) throw new Error("PM work scope is outside your Site");
}

function authorizeView(actor: PermissionUserContext, scope: PmWorkScope) {
  if (!canViewPm(actor)) throw new Error("You cannot view PM work");
  assertScope(actor, scope);
}

function authorizeManage(actor: PermissionUserContext, scope: PmWorkScope) {
  if (!canManagePmPlans(actor)) throw new Error("You cannot manage PM work");
  assertScope(actor, scope);
}

function authorizeExecute(actor: PermissionUserContext, scope: PmWorkScope) {
  if (!canExecutePmWork(actor)) throw new Error("You cannot execute PM work");
  assertScope(actor, scope);
}

async function activeScope(tx: Tx, scope: PmWorkScope) {
  await tx.plant.findFirstOrThrow({ where: { id: scope.plantId, organizationId: scope.organizationId, active: true, organization: { active: true } }, select: { id: true } });
}

async function audit(tx: Tx, actor: PermissionUserContext, scope: PmWorkScope, entityType: "PmWork" | "PmPlan", entityId: string, action: string, before: unknown, after: unknown) {
  await tx.auditEvent.create({ data: { actorId: actorId(actor), ...scope, entityType, entityId, action, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after) } });
}

function reason(value: string, label = "Reason") {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function resultInput(result: string, note?: string | null) {
  if (result !== PmResult.NORMAL && result !== PmResult.ABNORMAL) throw new Error("PM result must be Normal or Abnormal");
  const normalizedNote = note?.trim() || null;
  if (result === PmResult.ABNORMAL && !normalizedNote) throw new Error("A note is required for an Abnormal PM result");
  return { result: result as PmResultValue, resultNote: normalizedNote };
}

async function serializable<T>(operation: (tx: Tx) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") || attempt === 2) throw error;
    }
  }
  throw new Error("PM work mutation retry exhausted");
}

const detailInclude = {
  pmPlan: { select: { id: true, number: true, plannedDateKey: true, status: true } },
  asset: { select: { id: true, code: true, nameTh: true, registrationStatus: true, operatingStatus: true } },
  assignees: { orderBy: [{ role: "asc" as const }, { assignedAt: "asc" as const }], include: { user: { select: { id: true, fullName: true, role: true, active: true } } } },
  sourceGroups: { include: { pmPlanGroupSnapshot: true } },
  originatingCmWork: { select: { id: true, number: true, status: true } },
};

export async function getPmWorkDetail(actor: PermissionUserContext, input: PmWorkScope & { workId: string; todayDateKey?: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeView(actor, scope);
  const work = await db.pmWork.findFirstOrThrow({ where: { id: input.workId, plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId } }, include: detailInclude });
  const today = input.todayDateKey ?? getBangkokDateString();
  return { ...work, overdue: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS].includes(work.status as never) && work.pmPlan.plannedDateKey < today, retiredAsset: work.asset.registrationStatus !== "ACTIVE" };
}

export async function listPmWorks(actor: PermissionUserContext, input: PmWorkScope & { todayDateKey?: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeView(actor, scope);
  const rows = await db.pmWork.findMany({ where: { plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId } }, orderBy: [{ pmPlan: { plannedDateKey: "asc" } }, { number: "asc" }], include: detailInclude });
  const today = input.todayDateKey ?? getBangkokDateString();
  return rows.map(work => ({ ...work, overdue: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS].includes(work.status as never) && work.pmPlan.plannedDateKey < today, retiredAsset: work.asset.registrationStatus !== "ACTIVE" }));
}

export async function listEligiblePmAssignees(actor: PermissionUserContext, input: PmWorkScope) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeManage(actor, scope);
  const [users, rolePermissionOverrides] = await Promise.all([
    db.user.findMany({ where: { organizationId: scope.organizationId, plantId: scope.plantId, active: true }, include: { siteAdminPermissions: true, userPermissionOverrides: true } }),
    db.rolePermissionOverride.findMany({ where: { OR: [{ scopeKey: "SYSTEM" }, { organizationId: scope.organizationId }] } }),
  ]);
  return users.filter(user => canExecutePmWork({ ...user, rolePermissionOverrides }));
}

export async function assignPmWork(actor: PermissionUserContext, input: PmWorkScope & { workId: string; leadUserId: string; collaboratorUserIds?: string[]; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeManage(actor, scope);
  const leadUserId = input.leadUserId.trim();
  const collaboratorUserIds = [...new Set((input.collaboratorUserIds ?? []).map(id => id.trim()).filter(Boolean))].filter(id => id !== leadUserId);
  if (!leadUserId) throw new Error("A lead performer is required");
  return serializable(async tx => {
    await activeScope(tx, scope);
    const work = await tx.pmWork.findFirstOrThrow({ where: { id: input.workId, plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId }, status: { in: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS] } }, select: { id: true, number: true, status: true, plantId: true, pmPlan: { select: { organizationId: true, plannedDateKey: true } }, assignees: { select: { userId: true, role: true } } } });
    const ids = [leadUserId, ...collaboratorUserIds];
    const [users, rolePermissionOverrides] = await Promise.all([
      tx.user.findMany({ where: { id: { in: ids }, organizationId: scope.organizationId, plantId: scope.plantId, active: true }, include: { siteAdminPermissions: true, userPermissionOverrides: true } }),
      tx.rolePermissionOverride.findMany({ where: { OR: [{ scopeKey: "SYSTEM" }, { organizationId: scope.organizationId }] } }),
    ]);
    if (users.length !== ids.length || users.some(user => !canExecutePmWork({ ...user, rolePermissionOverrides }))) throw new Error("Every PM assignee must be active, in the same Site, and have PM execution permission");
    await tx.pmWorkAssignee.deleteMany({ where: { pmWorkId: work.id } });
    const now = input.now ?? new Date();
    for (const userId of ids) await tx.pmWorkAssignee.create({ data: { pmWorkId: work.id, userId, role: userId === leadUserId ? PmAssigneeRole.LEAD : PmAssigneeRole.COLLABORATOR, assignedAt: now, assignedById: actorId(actor) } });
    const after = ids.map(userId => ({ userId, role: userId === leadUserId ? PmAssigneeRole.LEAD : PmAssigneeRole.COLLABORATOR }));
    await audit(tx, actor, scope, "PmWork", work.id, "ASSIGN_PM_WORK", { assignees: work.assignees }, { assignees: after });
    await notifyPmAssignment(tx, { ...work, assignees: after }, work.assignees.map(item => item.userId), now);
    return { workId: work.id, assignees: after };
  });
}

export async function claimPmWork(actor: PermissionUserContext, input: PmWorkScope & { workId: string; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeExecute(actor, scope);
  return db.$transaction(async tx => {
    await activeScope(tx, scope);
    const work = await tx.pmWork.findFirstOrThrow({ where: { id: input.workId, plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId, status: PmPlanStatus.CONFIRMED } }, select: { id: true, status: true } });
    if (work.status !== PmWorkStatus.PLANNED) throw new Error("Only Planned PM work can be claimed");
    const existing = await tx.pmWorkAssignee.count({ where: { pmWorkId: work.id } });
    if (existing) throw new Error("PM work is already assigned");
    try {
      await tx.pmWorkAssignee.create({ data: { pmWorkId: work.id, userId: actorId(actor), role: PmAssigneeRole.LEAD, assignedAt: input.now ?? new Date(), assignedById: actorId(actor) } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("PM work was claimed by another User");
      throw error;
    }
    await audit(tx, actor, scope, "PmWork", work.id, "CLAIM_PM_WORK", { assignees: [] }, { assignees: [{ userId: actorId(actor), role: PmAssigneeRole.LEAD }] });
    return { claimed: true };
  });
}

async function requirePerformer(tx: Tx, actor: PermissionUserContext, workId: string) {
  const assigned = await tx.pmWorkAssignee.count({ where: { pmWorkId: workId, userId: actorId(actor) } });
  if (assigned !== 1) throw new Error("Only an assigned performer can execute this PM work");
}

export async function startPmWork(actor: PermissionUserContext, input: PmWorkScope & { workId: string; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeExecute(actor, scope);
  return db.$transaction(async tx => {
    await activeScope(tx, scope);
    await tx.pmWork.findFirstOrThrow({ where: { id: input.workId, plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId, status: PmPlanStatus.CONFIRMED } }, select: { id: true } });
    await requirePerformer(tx, actor, input.workId);
    const now = input.now ?? new Date();
    const changed = await tx.pmWork.updateMany({ where: { id: input.workId, plantId: scope.plantId, status: PmWorkStatus.PLANNED, assignees: { some: { userId: actorId(actor) } } }, data: { status: PmWorkStatus.IN_PROGRESS, startedAt: now } });
    if (changed.count !== 1) throw new Error("PM work was already started or changed");
    await audit(tx, actor, scope, "PmWork", input.workId, "START_PM_WORK", { status: PmWorkStatus.PLANNED }, { status: PmWorkStatus.IN_PROGRESS, startedAt: now });
    return { status: PmWorkStatus.IN_PROGRESS, startedAt: now };
  });
}

export async function completePmWork(actor: PermissionUserContext, input: PmWorkScope & { workId: string; result: string; note?: string | null; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeExecute(actor, scope);
  const result = resultInput(input.result, input.note);
  return db.$transaction(async tx => {
    await activeScope(tx, scope);
    await tx.pmWork.findFirstOrThrow({ where: { id: input.workId, plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId, status: PmPlanStatus.CONFIRMED } }, select: { id: true } });
    await requirePerformer(tx, actor, input.workId);
    const now = input.now ?? new Date();
    const changed = await tx.pmWork.updateMany({ where: { id: input.workId, plantId: scope.plantId, status: PmWorkStatus.IN_PROGRESS, assignees: { some: { userId: actorId(actor) } } }, data: { status: PmWorkStatus.COMPLETED, ...result, completedAt: now, completedById: actorId(actor) } });
    if (changed.count !== 1) throw new Error("Only In Progress PM work can be completed once");
    await audit(tx, actor, scope, "PmWork", input.workId, "COMPLETE_PM_WORK", { status: PmWorkStatus.IN_PROGRESS }, { status: PmWorkStatus.COMPLETED, ...result, completedAt: now, completedById: actorId(actor) });
    return { status: PmWorkStatus.COMPLETED, ...result, completedAt: now };
  });
}

export async function cancelPmWork(actor: PermissionUserContext, input: PmWorkScope & { workId: string; reason: string; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  const manager = canManagePmPlans(actor);
  if (manager) assertScope(actor, scope); else authorizeExecute(actor, scope);
  const cancellationReason = reason(input.reason, "Cancellation reason");
  return db.$transaction(async tx => {
    await activeScope(tx, scope);
    const before = await tx.pmWork.findFirstOrThrow({ where: { id: input.workId, plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId, status: PmPlanStatus.CONFIRMED } }, select: { id: true, status: true } });
    if (!manager) await requirePerformer(tx, actor, before.id);
    const now = input.now ?? new Date();
    const changed = await tx.pmWork.updateMany({ where: { id: before.id, plantId: scope.plantId, status: { in: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS] }, ...(!manager ? { assignees: { some: { userId: actorId(actor) } } } : {}) }, data: { status: PmWorkStatus.CANCELED, canceledAt: now, canceledById: actorId(actor), cancellationReason } });
    if (changed.count !== 1) throw new Error("Completed or canceled PM work cannot be canceled");
    await audit(tx, actor, scope, "PmWork", before.id, "CANCEL_PM_WORK", before, { status: PmWorkStatus.CANCELED, cancellationReason, canceledAt: now });
    return { canceled: true };
  });
}

export async function cancelConfirmedPmPlan(actor: PermissionUserContext, input: PmWorkScope & { planId: string; reason: string; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeManage(actor, scope);
  const cancellationReason = reason(input.reason, "Cancellation reason");
  return serializable(async tx => {
    await activeScope(tx, scope);
    const plan = await tx.pmPlan.findFirstOrThrow({ where: { id: input.planId, ...scope, status: PmPlanStatus.CONFIRMED }, select: { id: true, status: true } });
    const nonPlanned = await tx.pmWork.count({ where: { pmPlanId: plan.id, status: { not: PmWorkStatus.PLANNED } } });
    if (nonPlanned) throw new Error("A PM plan with started work cannot be canceled as a whole");
    const now = input.now ?? new Date();
    const locked = await tx.pmPlan.updateMany({ where: { id: plan.id, ...scope, status: PmPlanStatus.CONFIRMED, works: { every: { status: PmWorkStatus.PLANNED } } }, data: { status: PmPlanStatus.CANCELED, canceledAt: now, canceledById: actorId(actor), cancellationReason } });
    if (locked.count !== 1) throw new Error("PM plan changed while canceling");
    await tx.pmWork.updateMany({ where: { pmPlanId: plan.id, status: PmWorkStatus.PLANNED }, data: { status: PmWorkStatus.CANCELED, canceledAt: now, canceledById: actorId(actor), cancellationReason } });
    await audit(tx, actor, scope, "PmPlan", plan.id, "CANCEL_PM_PLAN", { status: PmPlanStatus.CONFIRMED }, { status: PmPlanStatus.CANCELED, cancellationReason });
    return { canceled: true };
  });
}

function validDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("A valid planned date is required");
  const [y, m, d] = value.split("-").map(Number);
  if (new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== value) throw new Error("A valid planned date is required");
  return value;
}

export async function rescheduleConfirmedPmPlan(actor: PermissionUserContext, input: PmWorkScope & { planId: string; plannedDateKey: string; reason: string; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeManage(actor, scope);
  const plannedDateKey = validDateKey(input.plannedDateKey);
  const rescheduleReason = reason(input.reason, "Reschedule reason");
  try {
    return await serializable(async tx => {
      await activeScope(tx, scope);
      const plan = await tx.pmPlan.findFirstOrThrow({ where: { id: input.planId, ...scope, status: PmPlanStatus.CONFIRMED }, select: { id: true, plannedDateKey: true, number: true } });
      if (await tx.pmWork.count({ where: { pmPlanId: plan.id, status: { not: PmWorkStatus.PLANNED } } })) throw new Error("A PM plan with started work cannot be rescheduled");
      const now = input.now ?? new Date();
      const changed = await tx.pmPlan.updateMany({ where: { id: plan.id, ...scope, status: PmPlanStatus.CONFIRMED, plannedDateKey: plan.plannedDateKey, works: { every: { status: PmWorkStatus.PLANNED } } }, data: { plannedDateKey, previousPlannedDateKey: plan.plannedDateKey, rescheduledAt: now, rescheduledById: actorId(actor), rescheduleReason } });
      if (changed.count !== 1) throw new Error("PM plan changed while rescheduling");
      await audit(tx, actor, scope, "PmPlan", plan.id, "RESCHEDULE_CONFIRMED_PM_PLAN", { plannedDateKey: plan.plannedDateKey, number: plan.number }, { plannedDateKey, number: plan.number, rescheduleReason });
      return { plannedDateKey, number: plan.number };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Another PM plan already occupies this Site and date");
    throw error;
  }
}

export async function addAssetToConfirmedPmPlan(actor: PermissionUserContext, input: PmWorkScope & { planId: string; assetId: string; reason: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeManage(actor, scope);
  const additionReason = reason(input.reason, "Addition reason");
  try {
    return await serializable(async tx => {
      await activeScope(tx, scope);
      const plan = await tx.pmPlan.findFirstOrThrow({ where: { id: input.planId, ...scope, status: PmPlanStatus.CONFIRMED }, select: { id: true, number: true } });
      if (!plan.number) throw new Error("Confirmed PM plan number is missing");
      const asset = await tx.asset.findFirstOrThrow({ where: { id: input.assetId, plantId: scope.plantId, registrationStatus: "ACTIVE" }, select: { id: true, code: true, nameTh: true } });
      const existing = await tx.pmWork.findUnique({ where: { pmPlanId_assetId: { pmPlanId: plan.id, assetId: asset.id } }, select: { id: true } });
      if (existing) throw new Error("This Asset already has PM work in the plan");
      const reserved = await tx.pmPlan.update({ where: { id: plan.id }, data: { lastWorkSequence: { increment: 1 } }, select: { lastWorkSequence: true } });
      const number = `${plan.number.replace(/^PMP-/, "PM-")}-${String(reserved.lastWorkSequence).padStart(3, "0")}`;
      const work = await tx.pmWork.create({ data: { plantId: scope.plantId, pmPlanId: plan.id, assetId: asset.id, assetCodeSnapshot: asset.code, assetNameSnapshot: asset.nameTh, number, status: PmWorkStatus.PLANNED, addedAfterConfirmation: true }, select: { id: true, number: true } });
      await audit(tx, actor, scope, "PmWork", work.id, "ADD_PM_WORK_AFTER_CONFIRMATION", null, { assetId: asset.id, number, workSequence: reserved.lastWorkSequence, addedAfterConfirmation: true, reason: additionReason });
      return work;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : String(error.meta?.target ?? "");
      if (target.includes("pmPlanId") && target.includes("assetId")) throw new Error("This Asset already has PM work in the plan");
    }
    throw error;
  }
}

export async function correctCompletedPmWorkResult(actor: PermissionUserContext, input: PmWorkScope & { workId: string; result: string; note?: string | null; reason: string; now?: Date }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorizeManage(actor, scope);
  const correctionReason = reason(input.reason, "Correction reason");
  const corrected = resultInput(input.result, input.note);
  return db.$transaction(async tx => {
    await activeScope(tx, scope);
    const before = await tx.pmWork.findFirstOrThrow({ where: { id: input.workId, plantId: scope.plantId, pmPlan: { organizationId: scope.organizationId }, status: PmWorkStatus.COMPLETED }, select: { id: true, status: true, result: true, resultNote: true, correctedAt: true, correctedById: true, correctionReason: true, updatedAt: true } });
    const now = input.now ?? new Date();
    const changed = await tx.pmWork.updateMany({ where: { id: before.id, plantId: scope.plantId, status: PmWorkStatus.COMPLETED, updatedAt: before.updatedAt }, data: { ...corrected, correctedAt: now, correctedById: actorId(actor), correctionReason } });
    if (changed.count !== 1) throw new Error("PM result changed while correcting; reload and try again");
    await audit(tx, actor, scope, "PmWork", before.id, "CORRECT_PM_WORK_RESULT", before, { ...corrected, correctedAt: now, correctedById: actorId(actor), correctionReason });
    return { ...corrected, correctedAt: now };
  });
}

export const cancelPmPlan = cancelConfirmedPmPlan;
export const correctPmWorkResult = correctCompletedPmWorkResult;
