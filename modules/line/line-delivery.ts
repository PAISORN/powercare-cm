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
  findByEvent(eventId: string, destinationId: string): Promise<LineDeliveryRecord | null>;
  claimFailed(id: string, maxAttempts: number): Promise<LineDeliveryRecord | null>;
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
  retryFailed?: boolean;
  throwOnFailure?: boolean;
};

const MAX_DELIVERY_ATTEMPTS = 3;

export function safeLineDeliveryError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const status = message.match(/^LINE (?:push|group summary) failed with status (\d{3})$/)?.[1];
  if (status) return `LINE API rejected the request (HTTP ${status})`;
  if (/timeout|abort/i.test(message)) return "LINE API request timed out";
  return "LINE delivery failed";
}

export function createLineDeliveryService({
  repository,
  client,
}: {
  repository: LineDeliveryRepository;
  client: LineTextClient;
}) {
  async function send(record: LineDeliveryRecord, targetId: string, payload: LineDeliveryPayload, throwOnFailure = false) {
    if (record.attempts >= MAX_DELIVERY_ATTEMPTS) throw new Error("LINE delivery retry limit reached");
    const attempts = record.attempts + 1;

    try {
      await client.pushText(targetId, payload.text);
      await repository.markSent(record.id, attempts, new Date());
    } catch (error) {
      await repository.markFailed(record.id, attempts, safeLineDeliveryError(error));
      if (throwOnFailure) throw error;
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
      if (!record) {
        if (!input.retryFailed) return;
        const existing = await repository.findByEvent(input.eventId, input.destinationId);
        if (!existing || existing.status !== "FAILED") return;
        const claimed = await repository.claimFailed(existing.id, MAX_DELIVERY_ATTEMPTS);
        if (!claimed) return;
        await send(claimed, input.targetId, JSON.parse(claimed.payloadJson) as LineDeliveryPayload, input.throwOnFailure);
        return;
      }
      await send(record, input.targetId, input.payload, input.throwOnFailure);
    },

    async retry(deliveryId: string, targetId: string) {
      const record = await repository.findById(deliveryId);
      if (!record) throw new Error("LINE delivery not found");
      if (record.status === "SENT") return;
      if (record.status !== "FAILED") return;
      if (record.attempts >= MAX_DELIVERY_ATTEMPTS) throw new Error("LINE delivery retry limit reached");
      const claimed = await repository.claimFailed(record.id, MAX_DELIVERY_ATTEMPTS);
      if (!claimed) return;
      const payload = JSON.parse(claimed.payloadJson) as LineDeliveryPayload;
      await send(claimed, targetId, payload, true);
    },
  };
}
