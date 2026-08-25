import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { RoleName, SITE_ADMIN_ROLE_VALUES } from "../cm-work/cm-work-types";
import type { OperationalScope } from "../organization/user-plant-scope";
import { selectRecipients } from "./notification-recipient";
import type { CmNotificationEvent, NotificationGroup } from "./notification-types";

export const IN_PROCESS_STATUSES = ["WAITING_TO_CLAIM", "CLAIMED", "IN_PROGRESS", "BACKLOG_SHUTDOWN", "WAITING_TO_CLOSE", "RETURNED_FOR_CORRECTION"];

export function groupToStatuses(group: NotificationGroup): string[] | null {
  if (group === "ALL_CM") return null;
  if (group === "IN_PROCESS") return IN_PROCESS_STATUSES;
  return [group];
}

export function groupUnreadByStatus(rows: Array<{ targetStatus: string | null; count: number }>) {
  const byStatus: Record<string, number> = {};
  for (const row of rows) if (row.targetStatus) byStatus[row.targetStatus] = row.count;
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  return {
    total,
    newRequest: byStatus.NEW ?? 0,
    inProcess: IN_PROCESS_STATUSES.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0),
    closed: byStatus.CLOSED ?? 0,
    canceled: byStatus.CANCELED ?? 0,
    byStatus,
  };
}

export async function createCmNotifications(event: CmNotificationEvent, tx: Prisma.TransactionClient) {
  const candidates = await tx.user.findMany({
    where: {
      active: true,
      OR: [
        { role: RoleName.ADMIN },
        { role: RoleName.ORGANIZATION_ADMIN, organizationId: event.organizationId },
        { role: { in: [...SITE_ADMIN_ROLE_VALUES] }, plantId: event.plantId },
        { categoryId: event.categoryId, plantId: event.plantId },
      ],
    },
    select: { id: true, role: true, categoryId: true, plantId: true, active: true },
  });
  const recipients = selectRecipients(event, candidates);
  if (!recipients.length) return;
  await tx.userNotification.createMany({
    data: recipients.map((recipient) => ({
      recipientId: recipient.id,
      eventType: event.eventType,
      entityType: "CmWork",
      entityId: event.cmWorkId,
      targetStatus: event.targetStatus,
      title: event.title,
      message: event.message,
      href: event.href,
    })),
  });
}

export async function getUnreadSummary(userId: string, scope?: OperationalScope) {
  const scopeFilter = await getScopedNotificationWorkFilter(scope);
  const rows = await db.userNotification.groupBy({
    by: ["targetStatus"],
    where: { recipientId: userId, readAt: null, entityType: "CmWork", ...scopeFilter },
    _count: { _all: true },
  });
  return groupUnreadByStatus(rows.map((row) => ({ targetStatus: row.targetStatus, count: row._count._all })));
}

export async function getUnreadWorkIds(userId: string, workIds: string[], scope?: OperationalScope) {
  if (!workIds.length) return new Set<string>();
  const scopedWorkIds = await filterWorkIdsByScope(workIds, scope);
  if (!scopedWorkIds.length) return new Set<string>();
  const rows = await db.userNotification.findMany({
    where: { recipientId: userId, readAt: null, entityType: "CmWork", entityId: { in: scopedWorkIds } },
    select: { entityId: true },
    distinct: ["entityId"],
  });
  return new Set(rows.map((row) => row.entityId));
}

export async function getUnreadCount(userId: string, scope?: OperationalScope) {
  const scopeFilter = await getScopedNotificationWorkFilter(scope);
  return db.userNotification.count({ where: { recipientId: userId, readAt: null, ...scopeFilter } });
}

export async function listNotifications(userId: string, page = 1, take = 50, scope?: OperationalScope) {
  const scopeFilter = await getScopedNotificationWorkFilter(scope);
  return db.userNotification.findMany({ where: { recipientId: userId, ...scopeFilter }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take });
}

export async function listRecentNotifications(userId: string, take = 10, scope?: OperationalScope) {
  const scopeFilter = await getScopedNotificationWorkFilter(scope);
  return db.userNotification.findMany({ where: { recipientId: userId, ...scopeFilter }, orderBy: { createdAt: "desc" }, take });
}

export async function markNotificationRead(userId: string, notificationId: string, scope?: OperationalScope) {
  const scopeFilter = await getScopedNotificationWorkFilter(scope);
  return db.userNotification.updateMany({ where: { id: notificationId, recipientId: userId, readAt: null, ...scopeFilter }, data: { readAt: new Date() } });
}

export async function markStatusGroupRead(userId: string, group: NotificationGroup, scope?: OperationalScope) {
  const statuses = groupToStatuses(group);
  const scopeFilter = await getScopedNotificationWorkFilter(scope);
  return db.userNotification.updateMany({
    where: { recipientId: userId, readAt: null, entityType: "CmWork", ...scopeFilter, ...(statuses ? { targetStatus: { in: statuses } } : {}) },
    data: { readAt: new Date() },
  });
}

export async function markWorkRead(userId: string, cmWorkId: string, scope?: OperationalScope) {
  const scopedWorkIds = await filterWorkIdsByScope([cmWorkId], scope);
  if (!scopedWorkIds.length) return { count: 0 };
  return db.userNotification.updateMany({ where: { recipientId: userId, readAt: null, entityType: "CmWork", entityId: { in: scopedWorkIds } }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string, scope?: OperationalScope) {
  const scopeFilter = await getScopedNotificationWorkFilter(scope);
  return db.userNotification.updateMany({ where: { recipientId: userId, readAt: null, ...scopeFilter }, data: { readAt: new Date() } });
}

async function getScopedNotificationWorkIds(scope?: OperationalScope) {
  if (!scope?.plantId && !scope?.organizationId) return null;
  const works = await db.cmWork.findMany({
    where: buildNotificationWorkWhere(scope),
    select: { id: true },
  });
  return works.map((work) => work.id);
}

async function getScopedNotificationWorkFilter(scope?: OperationalScope): Promise<Prisma.UserNotificationWhereInput> {
  const workIds = await getScopedNotificationWorkIds(scope);
  return workIds ? { entityType: "CmWork", entityId: { in: workIds } } : {};
}

async function filterWorkIdsByScope(workIds: string[], scope?: OperationalScope) {
  const scopedWorkIds = await getScopedNotificationWorkIds(scope);
  if (!scopedWorkIds) return workIds;
  const allowed = new Set(scopedWorkIds);
  return workIds.filter((workId) => allowed.has(workId));
}

function buildNotificationWorkWhere(scope?: OperationalScope): Prisma.CmWorkWhereInput {
  if (scope?.plantId) return { plantId: scope.plantId };
  if (scope?.organizationId) return { organizationId: scope.organizationId };
  return {};
}
