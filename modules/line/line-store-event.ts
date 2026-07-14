import type { LineStoreIssueEvent } from "./line-types";

export function formatLineStoreIssueMessage(event: LineStoreIssueEvent) {
  const lines = [
    "[PowerCare.CM]",
    `เลขที่เบิก: ${event.issueNumber}`,
    `สถานะ: ${event.statusLabel}`,
    `Site: ${event.siteName}`,
    `ผู้ขอเบิก: ${event.requesterName}`,
    `จำนวนรายการ: ${event.itemCount}`,
  ];

  const itemSummary = event.itemSummary?.trim();
  if (itemSummary) lines.push(`รายการ: ${itemSummary}`);
  if (event.actorName) lines.push(`ผู้ดำเนินการ: ${event.actorName}`);

  return lines.join("\n");
}
