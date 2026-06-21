import { db } from "../../lib/db";
import { canManageLineSettings } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";
import { LINE_EVENT_TYPES } from "./line-types";
import { parseLineDestinationInput } from "./line-settings";
import { retryLineDelivery, sendLineTest } from "./line-service";

export function listLineDestinations() {
  return db.lineDestination.findMany({
    include: { category: true, settings: true },
    orderBy: [{ active: "desc" }, { displayName: "asc" }],
  });
}

export async function saveLineDestination(
  actor: Actor,
  input: {
    id?: string | null;
    discoveryId?: string | null;
    displayName: string;
    targetId: string;
    categoryId?: string | null;
    active: boolean;
    enabledEvents: string[];
  },
) {
  if (!canManageLineSettings(actor.role)) throw new Error("Only Admin can manage LINE settings");
  const existing = input.id
    ? await db.lineDestination.findUnique({ where: { id: input.id } })
    : null;
  if (input.id && !existing) throw new Error("LINE destination not found");
  const normalized = parseLineDestinationInput({
    ...input,
    targetId: input.targetId.trim() || existing?.targetId || "",
  });

  return db.$transaction(async (tx) => {
    const discovery = input.discoveryId
      ? await tx.lineGroupDiscovery.findUnique({ where: { id: input.discoveryId } })
      : null;
    if (input.discoveryId && !discovery) throw new Error("LINE group discovery not found");
    if (discovery?.addedDestinationId) throw new Error("LINE group discovery is already linked");
    if (discovery && discovery.groupId !== normalized.targetId) throw new Error("LINE group discovery target does not match");

    const destination = existing
      ? await tx.lineDestination.update({
          where: { id: existing.id },
          data: {
            displayName: normalized.displayName,
            targetId: normalized.targetId,
            categoryId: normalized.categoryId,
            active: normalized.active,
          },
        })
      : await tx.lineDestination.create({
          data: {
            displayName: normalized.displayName,
            targetId: normalized.targetId,
            categoryId: normalized.categoryId,
            active: normalized.active,
          },
        });

    if (discovery) {
      await tx.lineGroupDiscovery.update({
        where: { id: discovery.id },
        data: { addedDestinationId: destination.id },
      });
    }

    for (const eventType of LINE_EVENT_TYPES) {
      await tx.lineEventSetting.upsert({
        where: { destinationId_eventType: { destinationId: destination.id, eventType } },
        create: {
          destinationId: destination.id,
          eventType,
          enabled: normalized.enabledEvents.includes(eventType),
        },
        update: { enabled: normalized.enabledEvents.includes(eventType) },
      });
    }

    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        entityType: "LineDestination",
        entityId: destination.id,
        action: existing ? "UPDATE_LINE_DESTINATION" : "CREATE_LINE_DESTINATION",
        beforeJson: existing ? JSON.stringify({ ...existing, targetId: "[MASKED]" }) : null,
        afterJson: JSON.stringify({
          id: destination.id,
          displayName: destination.displayName,
          categoryId: destination.categoryId,
          active: destination.active,
          enabledEvents: normalized.enabledEvents,
        }),
      },
    });
    return destination;
  });
}

export async function testLineDestination(actor: Actor, destinationId: string) {
  if (!canManageLineSettings(actor.role)) throw new Error("Only Admin can test LINE settings");
  const destination = await db.lineDestination.findUniqueOrThrow({ where: { id: destinationId } });
  await sendLineTest(destination.targetId);
  await db.auditEvent.create({
    data: {
      actorId: actor.id,
      entityType: "LineDestination",
      entityId: destination.id,
      action: "TEST_LINE_DESTINATION",
      afterJson: JSON.stringify({ displayName: destination.displayName }),
    },
  });
}

export async function retryFailedLineDelivery(actor: Actor, deliveryId: string) {
  if (!canManageLineSettings(actor.role)) throw new Error("Only Admin can retry LINE delivery");
  await retryLineDelivery(deliveryId);
  await db.auditEvent.create({
    data: {
      actorId: actor.id,
      entityType: "LineDeliveryLog",
      entityId: deliveryId,
      action: "RETRY_LINE_DELIVERY",
    },
  });
}
