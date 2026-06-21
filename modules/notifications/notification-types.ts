export const NotificationEventType = {
  NEW_REQUEST: "NEW_REQUEST",
  CLAIMED: "CLAIMED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_CLOSE: "WAITING_CLOSE",
  RETURNED: "RETURNED",
  RELEASED: "RELEASED",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
  ANNOUNCEMENT_PUBLISHED: "ANNOUNCEMENT_PUBLISHED",
} as const;

export type CmNotificationEvent = {
  eventType: string;
  cmWorkId: string;
  cmNumber: string;
  categoryId: string;
  claimantId: string | null;
  actorId: string | null;
  targetStatus: string;
  title: string;
  message: string;
  href: string;
};

export type NotificationGroup = "ALL_CM" | "NEW" | "IN_PROCESS" | "CLOSED" | "CANCELED" | string;
