import { differenceInCalendarDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "../../lib/db";
import { BANGKOK_TIME_ZONE } from "../../lib/date-time/bangkok-time";
import { recordAudit } from "../audit/audit-service";
import { canManageAnnouncements } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";
import { announcementInputSchema, type AnnouncementInput } from "./announcement-types";

type AnnouncementWindow = {
  active: boolean;
  publishStart: Date;
  publishEnd: Date;
};

type CreatedAnnouncement = {
  id: string;
  [key: string]: unknown;
};

export type AnnouncementStore = {
  create(data: AnnouncementInput & { authorId: string; id?: string; organizationId?: string | null }): Promise<CreatedAnnouncement>;
  audit(
    action: string,
    event: { actorId: string; entityId: string; organizationId?: string | null; before?: unknown; after?: unknown },
  ): Promise<unknown>;
};

function assertAdmin(actor: Actor) {
  if (!canManageAnnouncements(actor)) throw new Error("Only admin can manage announcements");
}

function validateInput(input: AnnouncementInput) {
  const parsed = announcementInputSchema.parse(input);
  if (parsed.publishEnd < parsed.publishStart) {
    throw new Error("Publish end must be on or after publish start");
  }
  return parsed;
}

export function isAnnouncementVisible(announcement: AnnouncementWindow, now = new Date()) {
  return announcement.active && announcement.publishStart <= now && announcement.publishEnd >= now;
}

export function isAnnouncementNew(publishStart: Date, now = new Date()) {
  const publishDay = toZonedTime(publishStart, BANGKOK_TIME_ZONE);
  const currentDay = toZonedTime(now, BANGKOK_TIME_ZONE);
  const dayDifference = differenceInCalendarDays(currentDay, publishDay);
  return dayDifference >= 0 && dayDifference < 3;
}

const prismaStore: AnnouncementStore = {
  create: (data) => db.announcement.create({ data }),
  audit: (action, event) =>
    recordAudit({
      actorId: event.actorId,
      organizationId: event.organizationId,
      entityType: "Announcement",
      entityId: event.entityId,
      action,
      before: event.before,
      after: event.after,
    }),
};

export async function createAnnouncementWithStore(
  store: AnnouncementStore,
  actor: Actor,
  input: AnnouncementInput,
  id?: string,
) {
  assertAdmin(actor);
  const parsed = validateInput(input);
  const created = await store.create({ ...parsed, authorId: actor.id, organizationId: null, ...(id ? { id } : {}) });
  await store.audit("CREATE_ANNOUNCEMENT", {
    actorId: actor.id,
    entityId: created.id,
    organizationId: null,
    after: created,
  });
  return created;
}

export function createAnnouncement(actor: Actor, input: AnnouncementInput, id?: string) {
  return createAnnouncementWithStore(prismaStore, actor, input, id);
}

export async function listPublicAnnouncements(now = new Date()) {
  const rows = await db.announcement.findMany({
    where: { active: true, organizationId: null, publishStart: { lte: now }, publishEnd: { gte: now } },
    orderBy: [{ pinned: "desc" }, { publishStart: "desc" }],
    include: { author: { select: { fullName: true } } },
  });
  return rows.map((row) => ({ ...row, isNew: isAnnouncementNew(row.publishStart, now) }));
}

export async function updateAnnouncement(actor: Actor, id: string, input: AnnouncementInput) {
  assertAdmin(actor);
  const parsed = validateInput(input);
  const before = await db.announcement.findFirstOrThrow({ where: { id, organizationId: null } });
  const updated = await db.announcement.update({ where: { id }, data: parsed });
  await recordAudit({
    actorId: actor.id,
    organizationId: null,
    entityType: "Announcement",
    entityId: id,
    action: "UPDATE_ANNOUNCEMENT",
    before,
    after: updated,
  });
  return updated;
}

export async function setAnnouncementActive(actor: Actor, id: string, active: boolean) {
  assertAdmin(actor);
  const before = await db.announcement.findFirstOrThrow({ where: { id, organizationId: null } });
  const updated = await db.announcement.update({ where: { id }, data: { active } });
  await recordAudit({
    actorId: actor.id,
    organizationId: null,
    entityType: "Announcement",
    entityId: id,
    action: active ? "ACTIVATE_ANNOUNCEMENT" : "DEACTIVATE_ANNOUNCEMENT",
    before,
    after: updated,
  });
  return updated;
}

export async function deleteAnnouncement(actor: Actor, id: string) {
  assertAdmin(actor);
  const before = await db.announcement.findFirstOrThrow({ where: { id, organizationId: null } });
  await db.announcement.delete({ where: { id: before.id } });
  await recordAudit({
    actorId: actor.id,
    organizationId: null,
    entityType: "Announcement",
    entityId: id,
    action: "DELETE_ANNOUNCEMENT",
    before,
  });
  return before;
}
