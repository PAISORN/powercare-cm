import { db } from "../../lib/db";
import { canManageLineSettings, canTestLineMessaging } from "../auth/permission";
import { RoleName, type Actor } from "../cm-work/cm-work-types";
import { LINE_EVENT_TYPES } from "./line-types";
import { parseLineDestinationInput } from "./line-settings";
import { retryLineDelivery, sendLineTest } from "./line-service";

function canManageLineAcrossPlants(actor: Actor) {
  return actor.role === RoleName.ADMIN || actor.role === RoleName.ORGANIZATION_ADMIN;
}

export function listLineDestinations(organizationId?: string, plantId?: string) {
  return db.lineDestination.findMany({
    where: { organizationId, ...(plantId ? { plantId } : {}) },
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
  if (!canManageLineSettings(actor)) throw new Error("Only Admin can manage LINE settings");
  const organizationId = actor.organizationId ?? null;
  const scopedPlantId = canManageLineAcrossPlants(actor) ? undefined : (actor.plantId ?? null);
  const existing = input.id
    ? await db.lineDestination.findFirst({ where: { id: input.id, organizationId, ...(scopedPlantId !== undefined ? { plantId: scopedPlantId } : {}) } })
    : null;
  if (input.id && !existing) throw new Error("LINE destination not found");
  const plantId = canManageLineAcrossPlants(actor) ? (actor.plantId ?? existing?.plantId ?? null) : (actor.plantId ?? null);
  const normalized = parseLineDestinationInput({
    ...input,
    targetId: input.targetId.trim() || existing?.targetId || "",
  });

  return db.$transaction(async (tx) => {
    const discovery = input.discoveryId
      ? await tx.lineGroupDiscovery.findFirst({ where: { id: input.discoveryId, organizationId } })
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
            plantId,
            categoryId: normalized.categoryId,
            active: normalized.active,
            organizationId,
          },
        })
      : await tx.lineDestination.create({
          data: {
            displayName: normalized.displayName,
            targetId: normalized.targetId,
            plantId,
            categoryId: normalized.categoryId,
            active: normalized.active,
            organizationId,
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
        organizationId: actor.organizationId,
        plantId: actor.plantId,
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
  if (!canTestLineMessaging(actor)) throw new Error("Only permitted users can test LINE settings");
  const scopedPlantId = canManageLineAcrossPlants(actor) ? undefined : (actor.plantId ?? null);
  const destination = await db.lineDestination.findFirstOrThrow({
    where: { id: destinationId, organizationId: actor.organizationId ?? null, ...(scopedPlantId !== undefined ? { plantId: scopedPlantId } : {}) },
  });
  await sendLineTest(destination.targetId);
  await db.auditEvent.create({
    data: {
      actorId: actor.id,
      organizationId: actor.organizationId,
      plantId: actor.plantId,
      entityType: "LineDestination",
      entityId: destination.id,
      action: "TEST_LINE_DESTINATION",
      afterJson: JSON.stringify({ displayName: destination.displayName }),
    },
  });
}

export async function retryFailedLineDelivery(actor: Actor, deliveryId: string) {
  if (!canManageLineSettings(actor)) throw new Error("Only Admin can retry LINE delivery");
  await retryLineDelivery(deliveryId, actor.organizationId);
  await db.auditEvent.create({
    data: {
      actorId: actor.id,
      organizationId: actor.organizationId,
      plantId: actor.plantId,
      entityType: "LineDeliveryLog",
      entityId: deliveryId,
      action: "RETRY_LINE_DELIVERY",
    },
  });
}
