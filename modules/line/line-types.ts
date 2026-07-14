export const LINE_EVENT_TYPES = [
  "NEW_REQUEST",
  "CLAIMED",
  "REASSIGNED",
  "STATUS_CHANGED",
  "RETURNED",
  "WAITING_CLOSE",
  "CLOSED",
  "CANCELED",
  "STORE_ISSUE_CREATED",
  "STORE_ISSUE_APPROVED",
  "STORE_ISSUE_REJECTED",
  "STORE_ISSUE_ISSUED",
  "STORE_NOT_ENOUGH_STOCK",
] as const;

export type LineEventType = (typeof LINE_EVENT_TYPES)[number];

export type LineRoutingEvent = {
  eventType: string;
  categoryId: string | null;
  plantId?: string | null;
};

export type LineRoutingDestination = {
  id: string;
  categoryId: string | null;
  plantId?: string | null;
  active: boolean;
  settings: Array<{ eventType: string; enabled: boolean }>;
};

export type LineWorkEvent = {
  eventId: string;
  eventType: LineEventType;
  organizationId?: string | null;
  plantId?: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  workId: string;
  workNumber: string;
  machineName: string;
  statusLabel: string;
  actorName?: string | null;
};

export type LineStoreIssueEvent = {
  eventId: string;
  eventType: LineEventType;
  organizationId?: string | null;
  plantId?: string | null;
  categoryId: string | null;
  issueId: string;
  issueNumber: string;
  statusLabel: string;
  requesterName: string;
  siteName: string;
  itemCount: number;
  itemSummary?: string | null;
  actorName?: string | null;
};

export type LineDeliveryPayload = {
  text: string;
  workId?: string;
  workNumber?: string;
  issueId?: string;
  issueNumber?: string;
};
