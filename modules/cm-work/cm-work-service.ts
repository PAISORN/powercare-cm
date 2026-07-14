import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { cacheTags, revalidateCmData } from "../../lib/query-cache";
import { canAssignWork, canCancelWork, canClaimWork, canCloseWork, canReturnWork } from "../auth/permission";
import { recordAudit } from "../audit/audit-service";
import { canTransition } from "./cm-work-state-machine";
import { reserveCmWorkNumber } from "./cm-work-sequence";
import { RoleName, statusLabels, WorkStatus, type Actor, type Urgency } from "./cm-work-types";
import { createCmNotifications } from "../notifications/notification-service";
import { NotificationEventType } from "../notifications/notification-types";
import { dispatchLineWorkEvent } from "../line/line-service";
import { mapCmNotificationToLineEvent } from "../line/line-work-event";
import { createPrismaRequestPlantScopeStore, resolveRequestPlantScope } from "../organization/plant-request-scope";

type AssignmentWork = {
  id: string;
  status: string;
  organizationId: string | null;
  plantId: string | null;
  categoryId: string;
  claimantId: string | null;
};

type AssignmentTechnician = {
  id: string;
  fullName: string;
  role: string;
  categoryId: string | null;
  categoryIds?: string[];
  plantId: string | null;
  active: boolean;
};

export type AssignmentStore = {
  getWork(id: string): Promise<AssignmentWork | null>;
  getTechnician(id: string): Promise<AssignmentTechnician | null>;
  getEngineerAssignmentEnabled(plantId?: string | null): Promise<boolean>;
  claimIfAvailable(input: {
    cmWorkId: string;
    technicianId: string;
    technicianName: string;
    actorId: string;
    organizationId: string | null;
    plantId: string | null;
    fromStatus: string;
  }): Promise<{ id: string; claimantId: string | null; status: string } | null>;
};

function createPrismaAssignmentStore(tx: Prisma.TransactionClient): AssignmentStore {
  return {
    getWork: (id) =>
      tx.cmWork.findUnique({
        where: { id },
        select: { id: true, status: true, organizationId: true, plantId: true, categoryId: true, claimantId: true },
      }),
    getTechnician: (id) =>
      tx.user.findUnique({
        where: { id },
        select: { id: true, fullName: true, role: true, categoryId: true, categories: { select: { categoryId: true } }, plantId: true, active: true },
      }).then((technician) =>
        technician
          ? {
              ...technician,
              categoryIds: technician.categories.map((category) => category.categoryId),
            }
          : null,
      ),
    async getEngineerAssignmentEnabled(plantId) {
      const scoped = plantId
        ? await tx.systemSetting.findUnique({ where: { plantId } })
        : null;
      if (scoped) return scoped.engineerWorkAssignmentEnabled;
      return (await tx.systemSetting.findUnique({ where: { id: "global" } }))
        ?.engineerWorkAssignmentEnabled ?? false;
    },
    async claimIfAvailable(input) {
      const claimedAt = new Date();
      const result = await tx.cmWork.updateMany({
        where: { id: input.cmWorkId, claimantId: null, status: input.fromStatus },
        data: { claimantId: input.technicianId, status: WorkStatus.CLAIMED, claimedAt },
      });
      if (result.count !== 1) return null;

      await tx.statusHistory.create({
        data: {
          cmWorkId: input.cmWorkId,
          fromStatus: input.fromStatus,
          toStatus: WorkStatus.CLAIMED,
          changedById: input.actorId,
          note: `Assigned to ${input.technicianName}`,
        },
      });
      await tx.auditEvent.create({
        data: {
          cmWorkId: input.cmWorkId,
          actorId: input.actorId,
          organizationId: input.organizationId,
          plantId: input.plantId,
          entityType: "CmWork",
          entityId: input.cmWorkId,
          action: "ASSIGN_WORK",
          beforeJson: JSON.stringify({ claimantId: null, status: input.fromStatus }),
          afterJson: JSON.stringify({ claimantId: input.technicianId, status: WorkStatus.CLAIMED }),
        },
      });

      return tx.cmWork.findUniqueOrThrow({
        where: { id: input.cmWorkId },
        select: { id: true, claimantId: true, status: true },
      });
    },
  };
}

export async function createRepairRequest(input: {
  requesterName: string;
  requesterDepartment: string;
  categoryId: string;
  zoneId: string;
  machineName: string;
  problemTitle: string;
  problemDetail: string;
  urgency: Urgency;
  plantCode?: string | null;
}) {
  const now = new Date();
  const { plantCode, ...workInput } = input;
  const work = await db.$transaction(async (tx) => {
    const number = await reserveCmWorkNumber(tx, now);
    const plantScope = await resolveRequestPlantScope(createPrismaRequestPlantScopeStore(tx), plantCode);
    const plant = await tx.plant.findUnique({ where: { id: plantScope.id }, select: { maxWorkRequests: true } });
    if (plant?.maxWorkRequests) {
      const currentCount = await tx.cmWork.count({ where: { plantId: plantScope.id } });
      if (currentCount >= plant.maxWorkRequests) throw new Error("SITE_REQUEST_LIMIT_REACHED");
    }

    return tx.cmWork.create({
      data: {
        ...workInput,
        organizationId: plantScope.organizationId,
        plantId: plantScope.id,
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
  });

  await recordAudit({
    cmWorkId: work.id,
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: work.id,
    action: "CREATE_REPAIR_REQUEST",
    after: work,
  });

  await emitWorkNotification(work.id, null, NotificationEventType.NEW_REQUEST, WorkStatus.NEW);

  revalidateCmData([cacheTags.dashboardSummary]);
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
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CLAIM_WORK",
    before: work,
    after: updated,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.CLAIMED, WorkStatus.CLAIMED);

  revalidateCmData([cacheTags.dashboardSummary]);
  return updated;
}

export async function assignWork(actor: Actor, cmWorkId: string, technicianId: string) {
  const updated = await db.$transaction((tx) =>
    assignWorkWithStore(createPrismaAssignmentStore(tx), actor, cmWorkId, technicianId),
  );
  revalidateCmData([cacheTags.dashboardSummary]);
  await emitWorkNotification(updated.id, actor.id, NotificationEventType.ASSIGNED, WorkStatus.CLAIMED);
  return updated;
}

export async function assignWorkWithStore(
  store: AssignmentStore,
  actor: Actor,
  cmWorkId: string,
  technicianId: string,
) {
  const [work, technician] = await Promise.all([
    store.getWork(cmWorkId),
    store.getTechnician(technicianId),
  ]);

  if (!work) throw new Error("CM work not found");
  const enabled = await store.getEngineerAssignmentEnabled(work.plantId);
  if (!technician || technician.role !== RoleName.TECHNICIAN) throw new Error("Technician not found");
  if (!technician.active) throw new Error("Technician is inactive");
  if (!canAssignWork(actor, work, enabled)) {
    if (actor.role === RoleName.ENGINEER && !enabled) {
      throw new Error("Engineer work assignment is disabled");
    }
    throw new Error("CM work is no longer available");
  }
  if (!hasWorkCategory(technician, work.categoryId)) throw new Error("Technician category mismatch");
  if (technician.plantId !== work.plantId) throw new Error("Technician plant mismatch");

  const updated = await store.claimIfAvailable({
    cmWorkId,
    technicianId,
    technicianName: technician.fullName,
    actorId: actor.id,
    organizationId: work.organizationId,
    plantId: work.plantId,
    fromStatus: work.status,
  });
  if (!updated) throw new Error("CM work is no longer available");
  return updated;
}

function hasWorkCategory(user: { categoryId: string | null; categoryIds?: string[] }, categoryId: string) {
  return user.categoryId === categoryId || Boolean(user.categoryIds?.includes(categoryId));
}

function isOwnerWorkActor(actor: Actor) {
  return actor.role === RoleName.ADMIN || actor.role === RoleName.ORGANIZATION_ADMIN;
}

export async function moveToInProgress(actor: Actor, cmWorkId: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id && !isOwnerWorkActor(actor)) throw new Error("Only claimant can start work");
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
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "START_WORK",
    before: work,
    after: updated,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.IN_PROGRESS, WorkStatus.IN_PROGRESS);

  revalidateCmData([cacheTags.dashboardSummary]);
  return updated;
}

export async function moveToBacklogShutdown(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!reason.trim()) throw new Error("Backlog shutdown reason is required");
  if (work.status !== WorkStatus.IN_PROGRESS) throw new Error("Only in-progress work can move to shutdown backlog");
  if (!canCancelWork(actor, work)) throw new Error("You cannot move this CM work to shutdown backlog");
  if (!canTransition(work.status, WorkStatus.BACKLOG_SHUTDOWN)) throw new Error("Invalid status transition");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.BACKLOG_SHUTDOWN,
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.BACKLOG_SHUTDOWN,
          changedById: actor.id,
          note: reason,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "MOVE_TO_BACKLOG_SHUTDOWN",
    before: work,
    after: updated,
    reason,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.IN_PROGRESS, WorkStatus.BACKLOG_SHUTDOWN);

  revalidateCmData([cacheTags.dashboardSummary]);
  return updated;
}

export async function submitForReview(
  actor: Actor,
  cmWorkId: string,
  input: { rootCause: string; correctiveAction: string; workNote?: string },
) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id && !isOwnerWorkActor(actor)) throw new Error("Only claimant can submit for review");
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
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "SUBMIT_FOR_REVIEW",
    before: work,
    after: updated,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.WAITING_CLOSE, WorkStatus.WAITING_TO_CLOSE);

  revalidateCmData([cacheTags.dashboardSummary]);
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
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "RELEASE_WORK",
    before: work,
    after: updated,
    reason,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.RELEASED, WorkStatus.WAITING_TO_CLAIM);

  revalidateCmData([cacheTags.dashboardSummary]);
  return updated;
}

export async function returnForCorrection(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!canReturnWork(actor, work)) throw new Error("You cannot return this CM work");
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
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "RETURN_FOR_CORRECTION",
    before: work,
    after: updated,
    reason,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.RETURNED, WorkStatus.RETURNED_FOR_CORRECTION);

  revalidateCmData([cacheTags.dashboardSummary]);
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
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CLOSE_WORK",
    before: work,
    after: updated,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.CLOSED, WorkStatus.CLOSED);

  revalidateCmData([cacheTags.dashboardSummary]);
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
    organizationId: work.organizationId,
    plantId: work.plantId,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CANCEL_WORK",
    before: work,
    after: updated,
    reason,
  });

  await emitWorkNotification(updated.id, actor.id, NotificationEventType.CANCELED, WorkStatus.CANCELED);

  return updated;
}

async function emitWorkNotification(cmWorkId: string, actorId: string | null, eventType: string, targetStatus: string) {
  const work = await db.cmWork.findUniqueOrThrow({
    where: { id: cmWorkId },
    select: {
      id: true,
      number: true,
      organizationId: true,
      plantId: true,
      categoryId: true,
      category: { select: { name: true } },
      claimantId: true,
      machineName: true,
      statusHistory: { orderBy: [{ changedAt: "desc" }, { id: "desc" }], take: 1, select: { id: true } },
    },
  });
  await db.$transaction((tx) =>
    createCmNotifications(
      {
        eventType,
        cmWorkId: work.id,
        cmNumber: work.number,
        organizationId: work.organizationId,
        categoryId: work.categoryId,
        plantId: work.plantId,
        claimantId: work.claimantId,
        actorId,
        targetStatus,
        title: `${work.number} · ${targetStatus}`,
        message: `CM work changed to ${targetStatus}`,
        href: `/work/${work.id}`,
      },
      tx,
    ),
  );

  const lineEventType = mapCmNotificationToLineEvent(eventType);
  const historyId = work.statusHistory[0]?.id;
  if (!lineEventType || !historyId) return;
  const actor = actorId
    ? await db.user.findUnique({ where: { id: actorId }, select: { fullName: true } })
    : null;
  await dispatchLineWorkEvent({
    eventId: historyId,
    eventType: lineEventType,
    organizationId: work.organizationId,
    plantId: work.plantId,
    categoryId: work.categoryId,
    categoryName: work.category.name,
    workId: work.id,
    workNumber: work.number,
    machineName: work.machineName,
    statusLabel: statusLabels[targetStatus as WorkStatus] ?? targetStatus,
    actorName: actor?.fullName,
  }).catch(() => undefined);
}
