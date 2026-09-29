import { db } from "../../lib/db";
import { dispatchLineStoreEvent } from "../line/line-service";
import type { LineEventType } from "../line/line-types";
import { StoreIssueStatus } from "./store-types";

export async function dispatchStoreIssueLineEvent(
  issueId: string,
  eventType: Extract<
    LineEventType,
    | "STORE_ISSUE_CREATED"
    | "STORE_ISSUE_APPROVED"
    | "STORE_ISSUE_REJECTED"
    | "STORE_ISSUE_ISSUED"
    | "STORE_NOT_ENOUGH_STOCK"
  >,
  actorName?: string | null,
) {
  const issue = await db.sparePartIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      number: true,
      status: true,
      organizationId: true,
      plantId: true,
      requesterName: true,
      plant: { select: { name: true, inventoryCode: true } },
      items: {
        select: {
          sparePart: { select: { name: true, categoryId: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!issue) return;

  await dispatchLineStoreEvent({
    eventId: `store:${issue.id}:${eventType}:${Date.now()}`,
    eventType,
    organizationId: issue.organizationId,
    plantId: issue.plantId,
    categoryId: issue.items[0]?.sparePart.categoryId ?? null,
    issueId: issue.id,
    issueNumber: issue.number,
    statusLabel: storeIssueStatusLabel(issue.status),
    requesterName: issue.requesterName,
    siteName: issue.plant.name || issue.plant.inventoryCode || "-",
    itemCount: issue.items.length,
    itemSummary: summarizeStoreIssueItems(issue.items.map((item) => item.sparePart.name)),
    actorName,
  });
}

function summarizeStoreIssueItems(names: string[]) {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (uniqueNames.length <= 3) return uniqueNames.join(", ");
  return `${uniqueNames.slice(0, 3).join(", ")} +${uniqueNames.length - 3}`;
}

function storeIssueStatusLabel(status: string) {
  if (status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL) return "รอ Engineer อนุมัติ";
  if (status === StoreIssueStatus.WAITING_STORE_ISSUE) return "รอ Store จ่าย";
  if (status === StoreIssueStatus.RETURNED_FOR_EDIT) return "ส่งกลับให้แก้ไข";
  if (status === StoreIssueStatus.ENGINEER_REJECTED) return "Engineer ไม่อนุมัติ";
  if (status === StoreIssueStatus.STORE_REJECTED) return "Store ไม่อนุมัติ";
  if (status === StoreIssueStatus.NOT_ENOUGH_STOCK) return "ของไม่พอ";
  if (status === StoreIssueStatus.PARTIALLY_ISSUED) return "จ่ายบางส่วน";
  if (status === StoreIssueStatus.ISSUED) return "จ่ายของแล้ว";
  if (status === StoreIssueStatus.CANCELED) return "ยกเลิก";
  return status;
}
