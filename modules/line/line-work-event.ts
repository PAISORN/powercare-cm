import type { LineEventType, LineWorkEvent } from "./line-types";

const notificationEventMap: Record<string, LineEventType | undefined> = {
  NEW_REQUEST: "NEW_REQUEST",
  CLAIMED: "CLAIMED",
  ASSIGNED: "REASSIGNED",
  IN_PROGRESS: "STATUS_CHANGED",
  WAITING_CLOSE: "WAITING_CLOSE",
  RETURNED: "RETURNED",
  RELEASED: "STATUS_CHANGED",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
};

export function mapCmNotificationToLineEvent(eventType: string) {
  return notificationEventMap[eventType] ?? null;
}

function getWorkCategoryLabel(categoryId: string | null, categoryName?: string | null) {
  const normalizedName = categoryName?.trim();
  if (normalizedName) return normalizedName;
  if (categoryId === "electrical") return "งานไฟฟ้า";
  if (categoryId === "mechanical") return "งานเครื่องกล";
  return "ไม่ระบุ";
}

export function formatLineWorkMessage(event: LineWorkEvent) {
  const lines = [
    "[PowerCare.CM]",
    `เลขที่: ${event.workNumber}`,
    `สถานะ: ${event.statusLabel}`,
    `ประเภทงาน: ${getWorkCategoryLabel(event.categoryId, event.categoryName)}`,
    `เครื่องจักร: ${event.machineName}`,
  ];
  if (event.actorName) lines.push(`ผู้ดำเนินการ: ${event.actorName}`);
  return lines.join("\n");
}
