import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory issue page", () => {
  it("provides create and tracking workspaces on the same page", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("ใบเบิกอะไหล่ / ติดตามสถานะ");
    expect(source).toContain("issue-create-workspace");
    expect(source).toContain('id="issue-tracking"');
    expect(source).toContain("TrackingStat");
    expect(source).toContain("IssueProgress");
    expect(source).toContain("filteredIssues");
  });

  it("renders the latest issue list as compact two-line rows", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("CompactIssueRow");
    expect(source).toContain("issue-row-two-line");
    expect(source).toContain("truncate");
    expect(source).toContain("details");
  });

  it("offers the server-authorized issue document only after full issue", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("canPrintSparePartIssueDocument(user, issue)");
    expect(source).toContain("/inventory/issue/${issue.id}/print");
    expect(source).toContain("พิมพ์เอกสาร");
  });

  it("allows authorized Engineer and Store Officer flows to cancel before issue and edit issue quantity", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("cancelIssueAction");
    expect(source).toContain("canCancelIssue");
    expect(source).toContain("ยกเลิกใบเบิก");
    expect(source).toContain("จำนวนที่จะจ่ายครั้งนี้ (แก้ไขได้)");
  });
});
