export const RoleName = {
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  TECHNICIAN: "TECHNICIAN",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const WorkStatus = {
  NEW: "NEW",
  WAITING_TO_CLAIM: "WAITING_TO_CLAIM",
  CLAIMED: "CLAIMED",
  IN_PROGRESS: "IN_PROGRESS",
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
};

export type WorkAccessContext = {
  status: WorkStatus | string;
  categoryId: string;
  claimantId: string | null;
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
  WAITING_TO_CLOSE: "รอปิดงาน",
  RETURNED_FOR_CORRECTION: "ส่งกลับให้แก้ไข",
  CLOSED: "ปิดงานแล้ว",
  CANCELED: "ยกเลิก",
};
