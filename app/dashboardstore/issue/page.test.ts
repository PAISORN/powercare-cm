import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory issue page", () => {
  it("provides separate create and tracking views on the issue route", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");

    expect(source).toContain('const trackingOnly = query.view === "tracking"');
    expect(source).toContain("{!trackingOnly ? (");
    expect(source).toContain("{trackingOnly ? (");
    expect(source).toContain('className="menu-heading-plain cm-hero');
    expect(source).toContain('aria-label="Stock Issue views"');
    expect(source).toContain("issue-create-workspace");
    expect(source).toContain('id="issue-tracking"');
    expect(source).toContain("TrackingStat");
    expect(source).toContain('aria-label="Issue status KPI strip"');
    expect(source).toContain("status-kpi-card relative block");
    expect(source).toContain("Issue Filters");
    expect(source).toContain("Issue Results");
    expect(source).toContain("hideHeader");
    expect(source).not.toContain("issue-request-page-gradient");
    expect(source).toContain("const trackingStatusHref");
    expect(source).toContain('href={trackingStatusHref("WAITING")}');
    expect(source).toContain('aria-current={active ? "page" : undefined}');
    expect(source).toContain("IssueProgress");
    expect(source).toContain("const trackingPageSize = 5");
    expect(source).toContain("pagedFilteredIssues.map");
    expect(source).toContain("Issue tracking pagination");
    expect(source).toContain('params.set("trackingPage", String(page))');
    expect(source).toContain("filteredIssueWhere");
    expect(source).toContain("db.sparePartIssue.count({ where: filteredIssueWhere })");
    expect(source).toContain("skip: (currentTrackingPage - 1) * trackingPageSize");
    expect(source).toContain("take: trackingPageSize");
    expect(source).not.toContain("take: 50");
    expect(source).toContain("RestoreListPosition");
    expect(source).toContain("PreserveListPositionForm");
  });

  it("renders the latest issue list as compact two-line rows", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");

    expect(source).toContain("CompactIssueRow");
    expect(source).toContain("issue-row-two-line");
    expect(source).toContain("last:border-b-0 hover:bg-[var(--soft)]");
    expect(source).toContain("truncate");
    expect(source).toContain("trackingInspectHref");
    expect(source).toContain("inspectIssueId");
    expect(source).toContain("PreserveListPositionLink");
    expect(source).toContain("fixed inset-y-0 right-0 z-50");
    expect(source).toContain("backdrop-blur-sm");
    expect(source).not.toContain("<details");
  });

  it("filters tracked issues through underlined inventory kind tabs", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");

    expect(source).toContain("IssueTrackingTabs");
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain("aria-selected={active}");
    expect(source).toContain('{ key: "SPARE_PART" as const, label: "อะไหล่", icon: Package }');
    expect(source).toContain('{ key: "CHEMICAL" as const, label: "สารเคมี", icon: Beaker }');
    expect(source).toContain('{ key: "OIL" as const, label: "น้ำมัน", icon: Droplets }');
    expect(source).toContain("const issueKindWhere");
    expect(source).toContain("itemKind: selectedTrackingKind");
    expect(source).toContain('name="itemKind" type="hidden" value={selectedTrackingKind}');
  });

  it("offers the server-authorized issue document only after full issue", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");

    expect(source).toContain("canPrintSparePartIssueDocument(user, issue)");
    expect(source).toContain("/dashboardstore/issue/${issue.id}/print");
    expect(source).toContain("พิมพ์เอกสาร");
  });

  it("allows authorized Engineer and Store Officer flows to cancel and issue the whole request once", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");

    expect(source).toContain("cancelIssueAction");
    expect(source).toContain("canCancelIssue");
    expect(source).toContain("ยกเลิกใบเบิก");
    expect(source).toContain("จ่ายอะไหล่ทั้งใบ");
    expect(source).not.toContain('name="issueQty"');
  });
});
