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
  PM_ASSIGNED: "PM_ASSIGNED",
  PM_REASSIGNED: "PM_REASSIGNED",
  PM_DUE_TODAY: "PM_DUE_TODAY",
  PM_OVERDUE: "PM_OVERDUE",
  PM_CM_LINKED: "PM_CM_LINKED",
} as const;

export type CmNotificationEvent = {
  eventType: string;
  cmWorkId: string;
  cmNumber: string;
  organizationId: string | null;
  categoryId: string;
  plantId: string | null;
  claimantId: string | null;
  actorId: string | null;
  targetStatus: string;
  title: string;
  message: string;
  href: string;
};

export type NotificationGroup = "ALL_CM" | "NEW" | "IN_PROCESS" | "CLOSED" | "CANCELED" | string;

export type NotificationEntityType = "CmWork" | "PmWork";

export type PmNotificationEvent = {
  eventType: string;
  pmWorkId: string;
  pmNumber: string;
  organizationId: string;
  plantId: string;
  targetStatus: string;
  title: string;
  message: string;
  href: string;
  recipientIds: string[];
  eventDateKey: string;
};
