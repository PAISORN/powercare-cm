import { db } from "../../lib/db";
import { createServerLineClient } from "./line-client";
import {
  createLineDeliveryService,
  type LineDeliveryRecord,
  type LineDeliveryRepository,
} from "./line-delivery";
import { selectLineDestinations } from "./line-routing";
import type { LineDeliveryPayload, LineWorkEvent } from "./line-types";
import { formatLineWorkMessage } from "./line-work-event";

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

const repository: LineDeliveryRepository = {
  async createPending(input) {
    try {
      return await db.lineDeliveryLog.create({
        data: { ...input, status: "PENDING" },
        select: {
          id: true,
          eventId: true,
          destinationId: true,
          eventType: true,
          payloadJson: true,
          status: true,
          attempts: true,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return null;
      throw error;
    }
  },
  findById(id) {
    return db.lineDeliveryLog.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
        destinationId: true,
        eventType: true,
        payloadJson: true,
        status: true,
        attempts: true,
      },
    });
  },
  async markSent(id, attempts, sentAt) {
    await db.lineDeliveryLog.update({
      where: { id },
      data: { status: "SENT", attempts, sentAt, errorSummary: null },
    });
  },
  async markFailed(id, attempts, errorSummary) {
    await db.lineDeliveryLog.update({
      where: { id },
      data: { status: "FAILED", attempts, errorSummary },
    });
  },
};

function deliveryService() {
  return createLineDeliveryService({ repository, client: createServerLineClient() });
}

export function isLineServerConfigured() {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim());
}

export async function dispatchLineWorkEvent(event: LineWorkEvent) {
  if (!isLineServerConfigured()) return;
  const destinations = await db.lineDestination.findMany({
    where: { active: true },
    include: { settings: true },
    orderBy: { displayName: "asc" },
  });
  const selected = selectLineDestinations(event, destinations);
  const payload: LineDeliveryPayload = {
    text: formatLineWorkMessage(event),
    workId: event.workId,
    workNumber: event.workNumber,
  };

  await Promise.all(
    selected.map((destination) =>
      deliveryService().deliver({
        eventId: event.eventId,
        eventType: event.eventType,
        destinationId: destination.id,
        targetId: destination.targetId,
        payload,
      }),
    ),
  );
}

export async function deliverLineDailyReport(input: {
  eventId: string;
  destinationId: string;
  targetId: string;
  text: string;
}) {
  if (!isLineServerConfigured()) throw new Error("LINE channel access token is not configured");
  await deliveryService().deliver({
    eventId: input.eventId,
    eventType: "DAILY_REPORT",
    destinationId: input.destinationId,
    targetId: input.targetId,
    payload: { text: input.text },
  });
}

export async function retryLineDelivery(deliveryId: string) {
  const delivery = await db.lineDeliveryLog.findUnique({
    where: { id: deliveryId },
    include: { destination: true },
  });
  if (!delivery) throw new Error("LINE delivery not found");
  if (!isLineServerConfigured()) throw new Error("LINE channel access token is not configured");
  await deliveryService().retry(delivery.id, delivery.destination.targetId);
}

export async function sendLineTest(targetId: string) {
  if (!isLineServerConfigured()) throw new Error("LINE channel access token is not configured");
  await createServerLineClient().pushText(targetId, "PowerCare.CM ทดสอบการแจ้งเตือน LINE สำเร็จ");
}

export function listLineDeliveryHistory(take = 50) {
  return db.lineDeliveryLog.findMany({
    include: { destination: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export type { LineDeliveryRecord };
