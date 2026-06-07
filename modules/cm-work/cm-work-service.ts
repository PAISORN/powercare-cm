import { db } from "../../lib/db";
import { canCancelWork, canClaimWork, canCloseWork } from "../auth/permission";
import { recordAudit } from "../audit/audit-service";
import { canTransition } from "./cm-work-state-machine";
import { formatCmWorkNumber } from "./cm-work-number";
import { RoleName, WorkStatus, type Actor, type Urgency } from "./cm-work-types";

export async function createRepairRequest(input: {
  requesterName: string;
  requesterDepartment: string;
  categoryId: string;
  zoneId: string;
  machineName: string;
  problemTitle: string;
  problemDetail: string;
  urgency: Urgency;
}) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const countThisMonth = await db.cmWork.count({
    where: { createdAt: { gte: monthStart, lt: nextMonth } },
  });
  const number = formatCmWorkNumber(now, countThisMonth + 1);

  const work = await db.cmWork.create({
    data: {
      ...input,
      number,
      status: WorkStatus.NEW,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: WorkStatus.NEW,
          note: "Repair request submitted",
        },
      },
    },
  });

  await recordAudit({
    cmWorkId: work.id,
    entityType: "CmWork",
    entityId: work.id,
    action: "CREATE_REPAIR_REQUEST",
    after: work,
  });

  return work;
}

export async function claimWork(actor: Actor, cmWorkId: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!canClaimWork(actor, work)) throw new Error("You cannot claim this CM work");
  if (!canTransition(work.status, WorkStatus.CLAIMED)) throw new Error("This status cannot move to claimed");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.CLAIMED,
      claimantId: actor.id,
      claimedAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.CLAIMED,
          changedById: actor.id,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CLAIM_WORK",
    before: work,
    after: updated,
  });

  return updated;
}

export async function moveToInProgress(actor: Actor, cmWorkId: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id && actor.role !== RoleName.ADMIN) throw new Error("Only claimant can start work");
  if (!canTransition(work.status, WorkStatus.IN_PROGRESS)) throw new Error("Invalid status transition");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.IN_PROGRESS,
      inProgressAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.IN_PROGRESS,
          changedById: actor.id,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "START_WORK",
    before: work,
    after: updated,
  });

  return updated;
}

export async function submitForReview(
  actor: Actor,
  cmWorkId: string,
  input: { rootCause: string; correctiveAction: string; workNote?: string },
) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id && actor.role !== RoleName.ADMIN) throw new Error("Only claimant can submit for review");
  if (!canTransition(work.status, WorkStatus.WAITING_TO_CLOSE)) throw new Error("Invalid status transition");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      rootCause: input.rootCause,
      correctiveAction: input.correctiveAction,
      workNote: input.workNote,
      status: WorkStatus.WAITING_TO_CLOSE,
      waitingToCloseAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.WAITING_TO_CLOSE,
          changedById: actor.id,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "SUBMIT_FOR_REVIEW",
    before: work,
    after: updated,
  });

  return updated;
}

export async function releaseWork(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id) throw new Error("Only claimant can release work");
  if (!reason.trim()) throw new Error("Release reason is required");
  if (!canTransition(work.status, WorkStatus.WAITING_TO_CLAIM)) throw new Error("Invalid status transition");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.WAITING_TO_CLAIM,
      claimantId: null,
      releaseReason: reason,
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.WAITING_TO_CLAIM,
          changedById: actor.id,
          note: reason,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "RELEASE_WORK",
    before: work,
    after: updated,
    reason,
  });

  return updated;
}

export async function returnForCorrection(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (actor.role !== RoleName.ADMIN && actor.role !== RoleName.ENGINEER) throw new Error("Only engineer or admin can return work");
  if (actor.role === RoleName.ENGINEER && actor.categoryId !== work.categoryId) throw new Error("Engineer category mismatch");
  if (!reason.trim()) throw new Error("Engineer note is required");
  if (!canTransition(work.status, WorkStatus.RETURNED_FOR_CORRECTION)) throw new Error("Invalid status transition");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.RETURNED_FOR_CORRECTION,
      returnedReason: reason,
      engineerNote: reason,
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.RETURNED_FOR_CORRECTION,
          changedById: actor.id,
          note: reason,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "RETURN_FOR_CORRECTION",
    before: work,
    after: updated,
    reason,
  });

  return updated;
}

export async function closeWork(actor: Actor, cmWorkId: string, engineerNote?: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!canCloseWork(actor, work)) throw new Error("You cannot close this CM work");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.CLOSED,
      reviewerId: actor.id,
      engineerNote,
      closedAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.CLOSED,
          changedById: actor.id,
          note: engineerNote,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CLOSE_WORK",
    before: work,
    after: updated,
  });

  return updated;
}

export async function cancelWork(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!canCancelWork(actor, work)) throw new Error("You cannot cancel this CM work");
  if (!reason.trim()) throw new Error("Cancellation reason is required");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.CANCELED,
      canceledReason: reason,
      canceledAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.CANCELED,
          changedById: actor.id,
          note: reason,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CANCEL_WORK",
    before: work,
    after: updated,
    reason,
  });

  return updated;
}
