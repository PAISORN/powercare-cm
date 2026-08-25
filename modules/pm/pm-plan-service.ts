import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { bangkokDayWindow, getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { canManagePmPlans, canViewPm } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import { PmPlanStatus } from "./pm-types";
import { reservePmPlanSequence } from "./pm-sequence-service";

export type PmPlanScope = { organizationId: string; plantId: string };

function actorId(actor: PermissionUserContext) {
  if (!actor.id) throw new Error("Authenticated user is required");
  return actor.id;
}

function validateDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("A valid planned date is required");
  const { start } = bangkokDayWindow(value);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) === "") throw new Error("A valid planned date is required");
  const [year, month, day] = value.split("-").map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== value) throw new Error("A valid planned date is required");
  return value;
}

function authorize(actor: PermissionUserContext, scope: PmPlanScope, manage: boolean) {
  if (manage ? !canManagePmPlans(actor) : !canViewPm(actor)) throw new Error(manage ? "You cannot manage PM plans" : "You cannot view PM plans");
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId) throw new Error("PM plan scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) throw new Error("PM plan scope is outside your Site");
}

async function activeScope(tx: Prisma.TransactionClient, actor: PermissionUserContext, scope: PmPlanScope, manage: boolean) {
  authorize(actor, scope, manage);
  await tx.plant.findFirstOrThrow({ where: { id: scope.plantId, organizationId: scope.organizationId, active: true, organization: { active: true } }, select: { id: true } });
}

async function draft(tx: Prisma.TransactionClient, scope: PmPlanScope, planId: string) {
  return tx.pmPlan.findFirstOrThrow({ where: { id: planId, ...scope, status: PmPlanStatus.DRAFT }, select: { id: true, plannedDateKey: true, status: true, submissionKey: true } });
}

async function audit(tx: Prisma.TransactionClient, actor: PermissionUserContext, scope: PmPlanScope, planId: string, action: string, before: unknown, after: unknown) {
  await tx.auditEvent.create({ data: { actorId: actorId(actor), ...scope, entityType: "PmPlan", entityId: planId, action, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after) } });
}

function unique(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function uniqueTargetFields(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  return String(target ?? "").split(/[^A-Za-z]+/).filter(Boolean);
}

function expectedPlanOccupancyConflict(error: unknown) {
  if (!unique(error)) return false;
  const fields = uniqueTargetFields(error as Prisma.PrismaClientKnownRequestError);
  return fields.includes("submissionKey") || (fields.includes("plantId") && fields.includes("plannedDateKey"));
}

function serializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function draftGroupUniqueConflict(error: unknown) {
  if (!unique(error)) return false;
  const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : String(target ?? "").split(/[^A-Za-z]+/);
  return fields.includes("pmPlanId") && fields.includes("pmGroupId");
}

async function serializableDraftMutation<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      // A serializable transaction makes the Draft status read and membership write one
      // concurrency boundary. Phase 5 confirmation must use the same boundary.
      return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!serializationConflict(error) || attempt === 2) throw error;
    }
  }
  throw new Error("PM Draft mutation retry exhausted");
}

const confirmedPlanInclude = {
  groupSnapshots: { orderBy: { createdAt: "asc" as const } },
  works: {
    orderBy: { number: "asc" as const },
    include: { sourceGroups: { include: { pmPlanGroupSnapshot: true } } },
  },
};

export async function confirmPmPlan(actor: PermissionUserContext, input: PmPlanScope & {
  planId: string;
  submissionKey: string;
  now?: Date;
}) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorize(actor, scope, true);
  const submissionKey = input.submissionKey.trim();
  if (!submissionKey) throw new Error("Submission key is required");
  const now = input.now ?? new Date();
  const creationDateKey = getBangkokDateString(now);

  const recoverConfirmed = () => db.pmPlan.findFirst({
      where: { id: input.planId, ...scope, submissionKey, status: PmPlanStatus.CONFIRMED },
      include: confirmedPlanInclude,
    });

  try {
    return await serializableDraftMutation(async (tx) => {
      const plant = await tx.plant.findFirstOrThrow({
        where: { id: scope.plantId, organizationId: scope.organizationId, active: true, organization: { active: true } },
        select: { id: true, code: true },
      });
      const plan = await tx.pmPlan.findFirstOrThrow({
        where: { id: input.planId, ...scope },
        select: { id: true, plannedDateKey: true, status: true, submissionKey: true, number: true },
      });
      if (plan.submissionKey !== submissionKey) throw new Error("Submission key belongs to another PM plan");
      if (plan.status === PmPlanStatus.CONFIRMED) {
        return tx.pmPlan.findFirstOrThrow({ where: { id: plan.id, ...scope }, include: confirmedPlanInclude });
      }
      if (plan.status !== PmPlanStatus.DRAFT) throw new Error("PM plan is no longer Draft");

      // This early conditional transition is the lock. It remains invisible until the
      // transaction commits and rolls back with every snapshot/work on any failure.
      const locked = await tx.pmPlan.updateMany({
        where: { id: plan.id, ...scope, status: PmPlanStatus.DRAFT, number: null },
        data: { status: PmPlanStatus.CONFIRMED },
      });
      if (locked.count !== 1) throw new Error("PM Draft changed while confirming; reload and try again");

      const selections = await tx.pmPlanDraftGroup.findMany({
        where: { pmPlanId: plan.id, plantId: scope.plantId },
        orderBy: [{ createdAt: "asc" }, { pmGroupId: "asc" }],
        include: {
          pmGroup: {
            include: {
              assets: {
                orderBy: { assetId: "asc" },
                include: { asset: { select: { id: true, plantId: true, code: true, nameTh: true, registrationStatus: true } } },
              },
            },
          },
        },
      });

      const activeGroups = selections.map(item => item.pmGroup).filter(group => group.active);
      const emptyGroups: Array<{ id: string; code: string; name: string }> = [];
      const assets = new Map<string, { id: string; code: string | null; name: string; sourceGroupIds: string[] }>();
      for (const group of activeGroups) {
        const eligible = group.assets
          .map(item => item.asset)
          .filter(asset => asset.plantId === scope.plantId && asset.registrationStatus === "ACTIVE");
        if (!eligible.length) emptyGroups.push({ id: group.id, code: group.code, name: group.name });
        for (const asset of eligible) {
          const found = assets.get(asset.id);
          if (found) found.sourceGroupIds.push(group.id);
          else assets.set(asset.id, { id: asset.id, code: asset.code, name: asset.nameTh, sourceGroupIds: [group.id] });
        }
      }
      if (!assets.size) throw new Error("Cannot confirm a PM plan without eligible Assets");

      const reserved = await reservePmPlanSequence(tx, plant.code, creationDateKey);
      const snapshotIds = new Map<string, string>();
      for (const group of activeGroups) {
        const snapshot = await tx.pmPlanGroupSnapshot.create({
          data: { plantId: scope.plantId, pmPlanId: plan.id, sourcePmGroupId: group.id, codeSnapshot: group.code, nameSnapshot: group.name },
          select: { id: true },
        });
        snapshotIds.set(group.id, snapshot.id);
      }

      const orderedAssets = [...assets.values()].sort((left, right) =>
        (left.code ?? "").localeCompare(right.code ?? "") || left.id.localeCompare(right.id));
      for (const [index, asset] of orderedAssets.entries()) {
        const work = await tx.pmWork.create({
          data: {
            plantId: scope.plantId,
            pmPlanId: plan.id,
            assetId: asset.id,
            assetCodeSnapshot: asset.code,
            assetNameSnapshot: asset.name,
            number: reserved.workNumber(index + 1),
            status: "PLANNED",
          },
          select: { id: true },
        });
        for (const groupId of asset.sourceGroupIds) {
          await tx.pmWorkSourceGroup.create({
            data: { pmWorkId: work.id, pmPlanId: plan.id, pmPlanGroupSnapshotId: snapshotIds.get(groupId)! },
          });
        }
      }

      await tx.pmGroup.updateMany({
        where: { id: { in: activeGroups.map(group => group.id) }, ...scope, firstUsedAt: null },
        data: { firstUsedAt: now },
      });
      await tx.auditEvent.create({
        data: {
          actorId: actorId(actor), ...scope, entityType: "PmPlan", entityId: plan.id, action: "CONFIRM_PM_PLAN",
          beforeJson: JSON.stringify({ status: PmPlanStatus.DRAFT, number: null }),
          afterJson: JSON.stringify({ status: PmPlanStatus.CONFIRMED, number: reserved.planNumber, creationDateKey, workCount: orderedAssets.length, emptyGroupIds: emptyGroups.map(group => group.id) }),
        },
      });
      await tx.pmPlan.update({
        where: { id: plan.id },
        data: { number: reserved.planNumber, creationDateKey, confirmedAt: now, confirmedById: actorId(actor), status: PmPlanStatus.CONFIRMED, lastWorkSequence: orderedAssets.length },
      });
      return tx.pmPlan.findFirstOrThrow({ where: { id: plan.id, ...scope }, include: confirmedPlanInclude });
    });
  } catch (error) {
    if (unique(error) || serializationConflict(error)) {
      const existing = await recoverConfirmed();
      if (existing) return existing;
      if (expectedPlanOccupancyConflict(error)) throw new Error("PM plan confirmation conflicts with another plan or submission");
    }
    throw error;
  }
}

export async function createOrGetDraftPmPlan(actor: PermissionUserContext, input: PmPlanScope & { plannedDateKey: string; submissionKey: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorize(actor, scope, true);
  const plannedDateKey = validateDateKey(input.plannedDateKey);
  const submissionKey = input.submissionKey.trim();
  if (!submissionKey) throw new Error("Submission key is required");
  const existing = await db.pmPlan.findUnique({ where: { submissionKey } });
  if (existing) {
    if (existing.organizationId !== scope.organizationId || existing.plantId !== scope.plantId || existing.plannedDateKey !== plannedDateKey) throw new Error("Submission key belongs to another PM plan");
    return existing;
  }
  try {
    return await db.$transaction(async (tx) => {
      await activeScope(tx, actor, scope, true);
      const created = await tx.pmPlan.create({ data: { ...scope, plannedDateKey, submissionKey, status: PmPlanStatus.DRAFT } });
      await audit(tx, actor, scope, created.id, "CREATE_PM_PLAN_DRAFT", null, { plannedDateKey, status: PmPlanStatus.DRAFT, groupIds: [] });
      return created;
    });
  } catch (error) {
    if (!unique(error)) throw error;
    const sameSubmission = await db.pmPlan.findUnique({ where: { submissionKey } });
    if (sameSubmission && sameSubmission.organizationId === scope.organizationId && sameSubmission.plantId === scope.plantId && sameSubmission.plannedDateKey === plannedDateKey) return sameSubmission;
    throw new Error("Another PM plan already occupies this Site and date");
  }
}

export async function getPmPlanEditor(actor: PermissionUserContext, input: PmPlanScope & { planId: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorize(actor, scope, false);
  return db.pmPlan.findFirstOrThrow({
    where: { id: input.planId, ...scope },
    include: { draftGroups: { orderBy: { createdAt: "asc" }, include: { pmGroup: true } }, works: { orderBy: { number: "asc" }, select: { id: true, status: true, assetId: true, number: true } } },
  });
}

export async function addDraftPmGroup(actor: PermissionUserContext, input: PmPlanScope & { planId: string; groupId: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  try {
    return await serializableDraftMutation(async (tx) => {
      await activeScope(tx, actor, scope, true);
      await draft(tx, scope, input.planId);
      await tx.pmGroup.findFirstOrThrow({ where: { id: input.groupId, ...scope, active: true }, select: { id: true } });
      const current = await tx.pmPlanDraftGroup.findMany({ where: { pmPlanId: input.planId }, select: { pmGroupId: true } });
      if (current.some(({ pmGroupId }) => pmGroupId === input.groupId)) return { added: false };
      await tx.pmPlanDraftGroup.create({ data: { plantId: scope.plantId, pmPlanId: input.planId, pmGroupId: input.groupId } });
      await audit(tx, actor, scope, input.planId, "ADD_PM_PLAN_DRAFT_GROUP", { groupIds: current.map(x => x.pmGroupId) }, { groupIds: [...current.map(x => x.pmGroupId), input.groupId] });
      return { added: true };
    });
  } catch (error) {
    if (draftGroupUniqueConflict(error)) return { added: false };
    throw error;
  }
}

export async function removeDraftPmGroup(actor: PermissionUserContext, input: PmPlanScope & { planId: string; groupId: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  return serializableDraftMutation(async (tx) => {
    await activeScope(tx, actor, scope, true);
    await draft(tx, scope, input.planId);
    const before = await tx.pmPlanDraftGroup.findMany({ where: { pmPlanId: input.planId }, select: { pmGroupId: true } });
    const removed = await tx.pmPlanDraftGroup.deleteMany({ where: { pmPlanId: input.planId, pmGroupId: input.groupId, plantId: scope.plantId } });
    if (removed.count === 0) return { removed: false };
    if (removed.count !== 1) throw new Error("PM Draft group removal affected an unexpected number of rows");
    await audit(tx, actor, scope, input.planId, "REMOVE_PM_PLAN_DRAFT_GROUP", { groupIds: before.map(x => x.pmGroupId) }, { groupIds: before.map(x => x.pmGroupId).filter(id => id !== input.groupId) });
    return { removed: true };
  });
}

export async function previewDraftPmPlan(actor: PermissionUserContext, input: PmPlanScope & { planId: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  authorize(actor, scope, false);
  const plan = await db.pmPlan.findFirstOrThrow({
    where: { id: input.planId, ...scope, status: PmPlanStatus.DRAFT },
    include: { draftGroups: { orderBy: { createdAt: "asc" }, include: { pmGroup: { include: { assets: { include: { asset: { select: { id: true, code: true, nameTh: true, registrationStatus: true, plantId: true } } } } } } } } },
  });
  const sources = new Map<string, Array<{ id: string; code: string; name: string }>>();
  const assets = new Map<string, { id: string; code: string | null; name: string; eligible: boolean }>();
  const emptyGroups: Array<{ id: string; code: string; name: string }> = [];
  const retiredGroups: Array<{ id: string; code: string; name: string }> = [];
  for (const selection of plan.draftGroups) {
    const group = selection.pmGroup;
    const source = { id: group.id, code: group.code, name: group.name };
    if (!group.active) retiredGroups.push(source);
    if (!group.assets.length) emptyGroups.push(source);
    for (const membership of group.assets) {
      const asset = membership.asset;
      const eligible = group.active && asset.plantId === scope.plantId && asset.registrationStatus === "ACTIVE";
      const previous = assets.get(asset.id);
      assets.set(asset.id, { id: asset.id, code: asset.code, name: asset.nameTh, eligible: Boolean(previous?.eligible || eligible) });
      sources.set(asset.id, [...(sources.get(asset.id) ?? []), source]);
    }
  }
  const rows = [...assets.values()].map(asset => ({ ...asset, sources: sources.get(asset.id) ?? [] })).sort((a, b) => (a.code ?? a.id).localeCompare(b.code ?? b.id));
  return { plan, assets: rows, duplicateAssets: rows.filter(row => row.sources.length > 1), emptyGroups, retiredGroups, ineligibleAssets: rows.filter(row => !row.eligible), eligibleAssetCount: rows.filter(row => row.eligible).length };
}

export async function rescheduleDraftPmPlan(actor: PermissionUserContext, input: PmPlanScope & { planId: string; plannedDateKey: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  const date = validateDateKey(input.plannedDateKey);
  try {
    return await db.$transaction(async (tx) => {
      await activeScope(tx, actor, scope, true);
      const before = await draft(tx, scope, input.planId);
      const changed = await tx.pmPlan.updateMany({ where: { id: input.planId, ...scope, status: PmPlanStatus.DRAFT, plannedDateKey: before.plannedDateKey }, data: { plannedDateKey: date, previousPlannedDateKey: before.plannedDateKey, rescheduledAt: new Date(), rescheduledById: actorId(actor) } });
      if (changed.count !== 1) throw new Error("PM Draft changed while rescheduling; reload and try again");
      await audit(tx, actor, scope, input.planId, "RESCHEDULE_PM_PLAN_DRAFT", { plannedDateKey: before.plannedDateKey }, { plannedDateKey: date });
      return { ...before, plannedDateKey: date };
    });
  } catch (error) {
    if (unique(error)) throw new Error("Another PM plan already occupies this Site and date");
    throw error;
  }
}

export async function deleteDraftPmPlan(actor: PermissionUserContext, input: PmPlanScope & { planId: string }) {
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  return serializableDraftMutation(async (tx) => {
    await activeScope(tx, actor, scope, true);
    const before = await draft(tx, scope, input.planId);
    const deleted = await tx.pmPlan.deleteMany({
      where: { id: input.planId, ...scope, status: PmPlanStatus.DRAFT },
    });
    if (deleted.count === 0) throw new Error("PM plan is no longer Draft; reload and try again");
    if (deleted.count !== 1) throw new Error("PM Draft deletion affected an unexpected number of rows");
    await audit(tx, actor, scope, input.planId, "DELETE_PM_PLAN_DRAFT", before, null);
    return { deleted: true };
  });
}
