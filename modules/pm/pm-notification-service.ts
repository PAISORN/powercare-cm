import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "../../lib/db";
import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { RoleName } from "../cm-work/cm-work-types";
import { canManagePmPlans } from "../auth/permission";
import { NotificationEventType, type PmNotificationEvent } from "../notifications/notification-types";
import { PmWorkStatus } from "./pm-types";

type Tx = Prisma.TransactionClient;

type NotificationWork = {
  id: string;
  number: string;
  status: string;
  plantId: string;
  pmPlan: { organizationId: string; plannedDateKey: string };
  assignees: Array<{ userId: string }>;
};

export function buildPmNotificationDispatchKey(recipientId: string, eventType: string, workId: string, eventDateKey: string) {
  return `PM:${recipientId}:${eventType}:${workId}:${eventDateKey}`;
}

export async function getPmNotificationRecipientIds(tx: Tx, work: NotificationWork) {
  const [candidates, rolePermissionOverrides] = await Promise.all([tx.user.findMany({
    where: {
      active: true,
      OR: [
        { role: RoleName.ADMIN },
        { organizationId: work.pmPlan.organizationId },
      ],
    },
    include: { siteAdminPermissions: true, userPermissionOverrides: true },
  }), tx.rolePermissionOverride.findMany({ where: { OR: [{ scopeKey: "SYSTEM" }, { organizationId: work.pmPlan.organizationId }] } })]);
  const managers = candidates.filter(user => managerScopeMatches(user, work) && canManagePmPlans({ ...user, rolePermissionOverrides }));
  return [...new Set([...work.assignees.map(item => item.userId), ...managers.map(item => item.id)])];
}

function managerScopeMatches(user: { role: string; organizationId?: string | null; plantId?: string | null }, work: NotificationWork) {
  if (user.role === RoleName.ADMIN) return true;
  if (user.organizationId !== work.pmPlan.organizationId) return false;
  return user.role === RoleName.ORGANIZATION_ADMIN || user.plantId === work.plantId;
}

export async function createPmNotifications(event: PmNotificationEvent, tx: Tx, options: { idempotent?: boolean } = {}) {
  const recipientIds = [...new Set(event.recipientIds)];
  let created = 0;
  for (const recipientId of recipientIds) {
    const data = {
          recipientId,
          eventType: event.eventType,
          entityType: "PmWork",
          entityId: event.pmWorkId,
          targetStatus: event.targetStatus,
          title: event.title,
          message: event.message,
          href: event.href,
          dispatchKey: options.idempotent ? buildPmNotificationDispatchKey(recipientId, event.eventType, event.pmWorkId, event.eventDateKey) : null,
        };
    if (!options.idempotent) { await tx.userNotification.create({ data }); created += 1; continue; }
    const id = randomUUID();
    const row = await tx.userNotification.upsert({ where: { dispatchKey: data.dispatchKey! }, create: { id, ...data }, update: {}, select: { id: true } });
    if (row.id === id) created += 1;
  }
  return created;
}

export async function notifyPmAssignment(tx: Tx, work: NotificationWork, previousRecipientIds: string[], now = new Date()) {
  const recipients = await getPmNotificationRecipientIds(tx, work);
  if (!recipients.length) return 0;
  const eventType = previousRecipientIds.length ? NotificationEventType.PM_REASSIGNED : NotificationEventType.PM_ASSIGNED;
  const assignees = new Set(work.assignees.map(item => item.userId));
  const event = {
    eventType,
    pmWorkId: work.id,
    pmNumber: work.number,
    organizationId: work.pmPlan.organizationId,
    plantId: work.plantId,
    targetStatus: work.status,
    title: eventType === NotificationEventType.PM_REASSIGNED ? "PM assignment updated" : "PM assignment created",
    message: `${work.number} assignment was updated`,
    href: `/dashboardpm/work/${work.id}`,
    recipientIds: recipients,
    eventDateKey: getBangkokDateString(now),
  };
  let created = 0;
  for (const recipientId of recipients) created += await createPmNotifications({ ...event, recipientIds: [recipientId], ...(assignees.has(recipientId) ? { title: eventType === NotificationEventType.PM_REASSIGNED ? "PM work reassigned" : "PM work assigned", message: `You are assigned to ${work.number}` } : {}) }, tx);
  return created;
}

export async function persistPmLinkedCmNotification(tx: Tx, workId: string, cmNumber: string) {
    const work = await tx.pmWork.findUniqueOrThrow({
      where: { id: workId },
      select: { id: true, number: true, status: true, plantId: true, pmPlan: { select: { organizationId: true, plannedDateKey: true } }, assignees: { select: { userId: true } } },
    });
    const recipientIds = await getPmNotificationRecipientIds(tx, work);
    return createPmNotifications({
      eventType: NotificationEventType.PM_CM_LINKED,
      pmWorkId: work.id,
      pmNumber: work.number,
      organizationId: work.pmPlan.organizationId,
      plantId: work.plantId,
      targetStatus: work.status,
      title: "CM work created from PM",
      message: `${cmNumber} was linked to ${work.number}`,
      href: `/dashboardpm/work/${work.id}`,
      recipientIds,
      eventDateKey: work.pmPlan.plannedDateKey,
    }, tx, { idempotent: true });
}

export function createPmDueOverdueDispatcher({
  findWorks,
  dispatch,
}: {
  findWorks: (todayDateKey: string) => Promise<NotificationWork[]>;
  dispatch: (work: NotificationWork, eventType: string, eventDateKey: string) => Promise<number>;
}) {
  return async ({ now = new Date() }: { now?: Date } = {}) => {
    const todayDateKey = getBangkokDateString(now);
    const works = await findWorks(todayDateKey);
    let created = 0;
    const results: Array<{ workId: string; eventType: string; created: number }> = [];
    const failures: Error[] = [];
    for (const work of works) {
      const eventType = work.pmPlan.plannedDateKey === todayDateKey ? NotificationEventType.PM_DUE_TODAY : NotificationEventType.PM_OVERDUE;
      try {
        const count = await dispatch(work, eventType, work.pmPlan.plannedDateKey);
        created += count;
        results.push({ workId: work.id, eventType, created: count });
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error("PM notification dispatch failed"));
        results.push({ workId: work.id, eventType, created: 0 });
      }
    }
    if (failures.length) throw new AggregateError(failures, `PM notification dispatch failed for ${failures.length} work(s)`);
    return { status: "DONE" as const, date: todayDateKey, total: works.length, created, results };
  };
}

export async function dispatchCurrentPmWorkNotification(tx: Tx, workId: string, todayDateKey: string) {
  const current = await tx.pmWork.findFirst({ where: { id: workId, status: { in: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS] }, pmPlan: { status: "CONFIRMED", plannedDateKey: { lte: todayDateKey } } }, select: { id: true, number: true, status: true, plantId: true, pmPlan: { select: { organizationId: true, plannedDateKey: true } }, assignees: { select: { userId: true } } } });
  if (!current) return 0;
  const eventType = current.pmPlan.plannedDateKey === todayDateKey ? NotificationEventType.PM_DUE_TODAY : NotificationEventType.PM_OVERDUE;
  const recipientIds = await getPmNotificationRecipientIds(tx, current);
  return createPmNotifications({ eventType, pmWorkId: current.id, pmNumber: current.number, organizationId: current.pmPlan.organizationId, plantId: current.plantId, targetStatus: current.status, title: eventType === NotificationEventType.PM_DUE_TODAY ? "PM work due today" : "PM work overdue", message: eventType === NotificationEventType.PM_DUE_TODAY ? `${current.number} is due today` : `${current.number} is overdue`, href: `/dashboardpm/work/${current.id}`, recipientIds, eventDateKey: current.pmPlan.plannedDateKey }, tx, { idempotent: true });
}

export async function dispatchPmDueOverdueNotifications(input: { now?: Date } = {}) {
  const todayDateKey = getBangkokDateString(input.now ?? new Date());
  return createPmDueOverdueDispatcher({
    findWorks: todayDateKey => db.pmWork.findMany({
      where: {
        status: { in: [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS] },
        pmPlan: { status: "CONFIRMED", plannedDateKey: { lte: todayDateKey } },
      },
      select: { id: true, number: true, status: true, plantId: true, pmPlan: { select: { organizationId: true, plannedDateKey: true } }, assignees: { select: { userId: true } } },
      orderBy: { number: "asc" },
    }),
    dispatch: work => db.$transaction(tx => dispatchCurrentPmWorkNotification(tx, work.id, todayDateKey)),
  })(input);
}
