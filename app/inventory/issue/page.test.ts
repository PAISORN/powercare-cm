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
    expect(source).toContain("const trackingPageSize = 5");
    expect(source).toContain("pagedFilteredIssues.map");
    expect(source).toContain("Issue tracking pagination");
    expect(source).toContain('params.set("trackingPage", String(page))');
  });

  it("renders the latest issue list as compact two-line rows", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("CompactIssueRow");
    expect(source).toContain("issue-row-two-line");
    expect(source).toContain("truncate");
    expect(source).toContain("details");
  });

  it("filters tracked issues through underlined inventory kind tabs", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("IssueTrackingTabs");
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain("aria-selected={active}");
    expect(source).toContain('{ key: "SPARE_PART" as const, label: "อะไหล่", icon: Package }');
    expect(source).toContain('{ key: "CHEMICAL" as const, label: "สารเคมี", icon: Beaker }');
    expect(source).toContain('{ key: "OIL" as const, label: "น้ำมัน", icon: Droplets }');
    expect(source).toContain("const kindIssues = issues.filter");
    expect(source).toContain('name="itemKind" type="hidden" value={selectedTrackingKind}');
  });

  it("offers the server-authorized issue document only after full issue", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("canPrintSparePartIssueDocument(user, issue)");
    expect(source).toContain("/inventory/issue/${issue.id}/print");
    expect(source).toContain("พิมพ์เอกสาร");
  });

  it("allows authorized Engineer and Store Officer flows to cancel and issue the whole request once", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("cancelIssueAction");
    expect(source).toContain("canCancelIssue");
    expect(source).toContain("ยกเลิกใบเบิก");
    expect(source).toContain("จ่ายอะไหล่ทั้งใบ");
    expect(source).not.toContain('name="issueQty"');
  });
});
