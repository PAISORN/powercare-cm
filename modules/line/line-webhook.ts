import { createHmac, timingSafeEqual } from "node:crypto";

export type LineGroupEvent = {
  groupId: string;
  eventType: string;
};

type UnknownRecord = Record<string, unknown>;

export function verifyLineWebhookSignature(rawBody: string, signature: string | null, channelSecret: string) {
  if (!channelSecret.trim() || !signature?.trim()) return false;

  try {
    const expected = createHmac("sha256", channelSecret).update(rawBody).digest();
    const received = Buffer.from(signature, "base64");
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

export function extractLineGroupEvents(payload: unknown): LineGroupEvent[] {
  if (!isRecord(payload) || !Array.isArray(payload.events)) return [];

  const groups = new Map<string, LineGroupEvent>();
  for (const candidate of payload.events) {
    if (!isRecord(candidate) || typeof candidate.type !== "string" || !isRecord(candidate.source)) continue;
    if (candidate.source.type !== "group" || typeof candidate.source.groupId !== "string") continue;

    const groupId = candidate.source.groupId.trim();
    const eventType = candidate.type.trim();
    if (!groupId || !eventType) continue;
    groups.set(groupId, { groupId, eventType });
  }

  return [...groups.values()];
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
