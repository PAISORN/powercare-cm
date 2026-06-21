export const LINE_EVENT_TYPES = [
  "NEW_REQUEST",
  "CLAIMED",
  "REASSIGNED",
  "STATUS_CHANGED",
  "RETURNED",
  "WAITING_CLOSE",
  "CLOSED",
  "CANCELED",
] as const;

export type LineEventType = (typeof LINE_EVENT_TYPES)[number];

export type LineRoutingEvent = {
  eventType: string;
  categoryId: string | null;
};

export type LineRoutingDestination = {
  id: string;
  categoryId: string | null;
  active: boolean;
  settings: Array<{ eventType: string; enabled: boolean }>;
};

export type LineWorkEvent = {
  eventId: string;
  eventType: LineEventType;
  categoryId: string | null;
  categoryName?: string | null;
  workId: string;
  workNumber: string;
  machineName: string;
  statusLabel: string;
  actorName?: string | null;
};

export type LineDeliveryPayload = {
  text: string;
  workId?: string;
  workNumber?: string;
};
