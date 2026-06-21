import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { selectRecipients } from "./notification-recipient";
import type { CmNotificationEvent, NotificationGroup } from "./notification-types";

export const IN_PROCESS_STATUSES = ["WAITING_TO_CLAIM", "CLAIMED", "IN_PROGRESS", "WAITING_TO_CLOSE", "RETURNED_FOR_CORRECTION"];

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
    where: { active: true, OR: [{ role: "ADMIN" }, { categoryId: event.categoryId }] },
    select: { id: true, role: true, categoryId: true, active: true },
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

export async function getUnreadSummary(userId: string) {
  const rows = await db.userNotification.groupBy({
    by: ["targetStatus"],
    where: { recipientId: userId, readAt: null, entityType: "CmWork" },
    _count: { _all: true },
  });
  return groupUnreadByStatus(rows.map((row) => ({ targetStatus: row.targetStatus, count: row._count._all })));
}

export async function getUnreadWorkIds(userId: string, workIds: string[]) {
  if (!workIds.length) return new Set<string>();
  const rows = await db.userNotification.findMany({
    where: { recipientId: userId, readAt: null, entityType: "CmWork", entityId: { in: workIds } },
    select: { entityId: true },
    distinct: ["entityId"],
  });
  return new Set(rows.map((row) => row.entityId));
}

export function getUnreadCount(userId: string) {
  return db.userNotification.count({ where: { recipientId: userId, readAt: null } });
}

export function listNotifications(userId: string, page = 1, take = 50) {
  return db.userNotification.findMany({ where: { recipientId: userId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take });
}

export function listRecentNotifications(userId: string, take = 10) {
  return db.userNotification.findMany({ where: { recipientId: userId }, orderBy: { createdAt: "desc" }, take });
}

export function markNotificationRead(userId: string, notificationId: string) {
  return db.userNotification.updateMany({ where: { id: notificationId, recipientId: userId, readAt: null }, data: { readAt: new Date() } });
}

export function markStatusGroupRead(userId: string, group: NotificationGroup) {
  const statuses = groupToStatuses(group);
  return db.userNotification.updateMany({
    where: { recipientId: userId, readAt: null, entityType: "CmWork", ...(statuses ? { targetStatus: { in: statuses } } : {}) },
    data: { readAt: new Date() },
  });
}

export function markWorkRead(userId: string, cmWorkId: string) {
  return db.userNotification.updateMany({ where: { recipientId: userId, readAt: null, entityType: "CmWork", entityId: cmWorkId }, data: { readAt: new Date() } });
}

export function markAllNotificationsRead(userId: string) {
  return db.userNotification.updateMany({ where: { recipientId: userId, readAt: null }, data: { readAt: new Date() } });
}
