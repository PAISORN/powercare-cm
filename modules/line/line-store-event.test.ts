import { describe, expect, it } from "vitest";
import { formatLineStoreIssueMessage } from "./line-store-event";

describe("LINE Store issue event", () => {
  it("formats a readable Store issue message", () => {
    const message = formatLineStoreIssueMessage({
      eventId: "store-issue-1-created",
      eventType: "STORE_ISSUE_CREATED",
      organizationId: "org-1",
      plantId: "site-1",
      categoryId: "cat-1",
      issueId: "issue-1",
      issueNumber: "SI-RTB-2026-07-0001",
      statusLabel: "รอ Engineer อนุมัติ",
      requesterName: "Somchai",
      siteName: "RTB",
      itemCount: 2,
      itemSummary: "Bearing, Fuse",
      actorName: "Electrical Engineer",
    });

    expect(message).toContain("[PowerCare.CM]");
    expect(message).toContain("เลขที่เบิก: SI-RTB-2026-07-0001");
    expect(message).toContain("สถานะ: รอ Engineer อนุมัติ");
    expect(message).toContain("Site: RTB");
    expect(message).toContain("ผู้ขอเบิก: Somchai");
    expect(message).toContain("รายการ: Bearing, Fuse");
    expect(message).toContain("ผู้ดำเนินการ: Electrical Engineer");
    expect(message).not.toContain("à¸");
  });
});
