export const RoleName = {
  ADMIN: "ADMIN",
  ORGANIZATION_ADMIN: "ORGANIZATION_ADMIN",
  SITE_ADMIN: "SITE_ADMIN",
  ENGINEER: "ENGINEER",
  TECHNICIAN: "TECHNICIAN",
  STORE_OFFICER: "STORE_OFFICER",
  VISITOR: "VISITOR",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const LEGACY_SITE_ADMIN_ROLE = "PLANT_ADMIN";
export const SITE_ADMIN_ROLE_VALUES = [RoleName.SITE_ADMIN, LEGACY_SITE_ADMIN_ROLE] as const;

export function isSiteAdminRole(role: string) {
  return (SITE_ADMIN_ROLE_VALUES as readonly string[]).includes(role);
}

export const WorkStatus = {
  NEW: "NEW",
  WAITING_TO_CLAIM: "WAITING_TO_CLAIM",
  CLAIMED: "CLAIMED",
  IN_PROGRESS: "IN_PROGRESS",
  BACKLOG_SHUTDOWN: "BACKLOG_SHUTDOWN",
  WAITING_TO_CLOSE: "WAITING_TO_CLOSE",
  RETURNED_FOR_CORRECTION: "RETURNED_FOR_CORRECTION",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
} as const;

export type WorkStatus = (typeof WorkStatus)[keyof typeof WorkStatus];

export const Urgency = {
  NORMAL: "NORMAL",
  URGENT: "URGENT",
  CRITICAL: "CRITICAL",
} as const;

export type Urgency = (typeof Urgency)[keyof typeof Urgency];

export type Actor = {
  id: string;
  role: RoleName;
  categoryId: string | null;
  categoryIds?: string[];
  organizationId?: string | null;
  plantId?: string | null;
  siteAdminPermissions?: {
    userId: string;
    plantId: string;
    permissionKey: string;
    enabled: boolean;
  }[];
};

export type WorkAccessContext = {
  status: WorkStatus | string;
  categoryId: string;
  claimantId: string | null;
  plantId?: string | null;
};

export const urgencyLabels: Record<Urgency, string> = {
  NORMAL: "ปกติ",
  URGENT: "เร่งด่วน",
  CRITICAL: "วิกฤต",
};

export const statusLabels: Record<WorkStatus, string> = {
  NEW: "แจ้งใหม่",
  WAITING_TO_CLAIM: "รอรับงาน",
  CLAIMED: "รับเรื่องแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  BACKLOG_SHUTDOWN: "Backlog Shutdown",
  WAITING_TO_CLOSE: "รอปิดงาน",
  RETURNED_FOR_CORRECTION: "ส่งกลับให้แก้ไข",
  CLOSED: "ปิดงานแล้ว",
  CANCELED: "ยกเลิก",
};
