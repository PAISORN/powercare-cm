import type { LineDeliveryPayload } from "./line-types";

export type LineDeliveryRecord = {
  id: string;
  eventId: string;
  destinationId: string;
  eventType: string;
  payloadJson: string;
  status: string;
  attempts: number;
};

export type LineDeliveryRepository = {
  createPending(input: {
    eventId: string;
    destinationId: string;
    eventType: string;
    payloadJson: string;
  }): Promise<LineDeliveryRecord | null>;
  findById(id: string): Promise<LineDeliveryRecord | null>;
  markSent(id: string, attempts: number, sentAt: Date): Promise<void>;
  markFailed(id: string, attempts: number, errorSummary: string): Promise<void>;
};

type LineTextClient = {
  pushText(targetId: string, text: string): Promise<void>;
};

type NewDelivery = {
  eventId: string;
  destinationId: string;
  eventType: string;
  targetId: string;
  payload: LineDeliveryPayload;
};

const MAX_DELIVERY_ATTEMPTS = 3;

export function createLineDeliveryService({
  repository,
  client,
}: {
  repository: LineDeliveryRepository;
  client: LineTextClient;
}) {
  async function send(record: LineDeliveryRecord, targetId: string, payload: LineDeliveryPayload) {
    if (record.attempts >= MAX_DELIVERY_ATTEMPTS) throw new Error("LINE delivery retry limit reached");
    const attempts = record.attempts + 1;

    try {
      await client.pushText(targetId, payload.text);
      await repository.markSent(record.id, attempts, new Date());
    } catch {
      await repository.markFailed(record.id, attempts, "LINE delivery failed");
    }
  }

  return {
    async deliver(input: NewDelivery) {
      const record = await repository.createPending({
        eventId: input.eventId,
        destinationId: input.destinationId,
        eventType: input.eventType,
        payloadJson: JSON.stringify(input.payload),
      });
      if (!record) return;
      await send(record, input.targetId, input.payload);
    },

    async retry(deliveryId: string, targetId: string) {
      const record = await repository.findById(deliveryId);
      if (!record) throw new Error("LINE delivery not found");
      if (record.status === "SENT") return;
      if (record.attempts >= MAX_DELIVERY_ATTEMPTS) throw new Error("LINE delivery retry limit reached");
      const payload = JSON.parse(record.payloadJson) as LineDeliveryPayload;
      await send(record, targetId, payload);
    },
  };
}
