import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory issue page", () => {
  it("provides separate create and tracking views on the issue route", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");
    const filterSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-filter-panel.tsx",
      "utf8",
    );
    const resultsSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-results.tsx",
      "utf8",
    );
    const createSource = readFileSync(
      "app/dashboardstore/issue/issue-create-workspace.tsx",
      "utf8",
    );
    const headerSource = readFileSync(
      "app/dashboardstore/issue/issue-page-header.tsx",
      "utf8",
    );
    const feedbackSource = readFileSync(
      "app/dashboardstore/issue/issue-page-feedback.tsx",
      "utf8",
    );

    expect(source).toContain('const trackingOnly = query.view === "tracking"');
    expect(source).toContain("{!trackingOnly ? (");
    expect(source).toContain("{trackingOnly ? (");
    expect(source).toContain("IssuePageHeader");
    expect(headerSource).toContain("all-work-heading stock-issue-heading");
    expect(headerSource).toContain('aria-label="Stock Issue views"');
    expect(headerSource).toContain("IssueTrackingFilterPanel");
    expect(source).toContain("IssuePageFeedback");
    expect(feedbackSource).toContain("ส่งคำขอเบิกสำเร็จ");
    expect(feedbackSource).toContain('role="alert"');
    expect(source).toContain("IssueCreateWorkspace");
    expect(createSource).toContain('data-testid="issue-create-workspace"');
    expect(resultsSource).toContain('id="issue-tracking"');
    expect(resultsSource).toContain("TrackingStat");
    expect(resultsSource).toContain('aria-label="Issue status KPI strip"');
    expect(resultsSource).toContain("dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide");
    expect(resultsSource).toContain("dashboard-kpi-carousel");
    expect(filterSource).toContain("Issue Filters");
    expect(filterSource).toContain('data-testid="issue-filter-bar"');
    expect(filterSource).toContain('aria-label="ตัวกรอง Stock Issue"');
    expect(filterSource).toMatch(
      /<details[^>]*data-testid="issue-filter-bar"[^>]*\bopen>/,
    );
    expect(filterSource).toContain(
      "ตัวกรอง · {issueKindLabel(query.itemKind)}",
    );
    expect(source).toContain("defaultInventoryItemKind(user)");
    expect(resultsSource).toContain("Issue Results");
    expect(createSource).toContain("hideHeader");
    expect(createSource).toContain("IssueRequestForm");
    expect(createSource).toContain("createIssueAction");
    expect(createSource).toContain("buildStoreStockStatus");
    expect(source).not.toContain("IssueRequestForm");
    expect(source).not.toContain("issue-request-page-gradient");
    expect(resultsSource).toContain("buildIssueTrackingStatusHref");
    expect(resultsSource).toContain('href={statusHref("WAITING")}');
    expect(resultsSource).toContain(
      'aria-current={active ? "page" : undefined}',
    );
    expect(resultsSource).toContain("IssueTrackingRow");
    expect(source).toContain("loadIssuePageData");
    expect(resultsSource).toContain("issues.map");
    expect(resultsSource).toContain("Issue tracking pagination");
    expect(resultsSource).toContain("buildIssueTrackingPageHref");
    expect(source).not.toContain("db.sparePartIssue.findMany");
    expect(source).not.toContain("db.storeStock.findMany");
    expect(Math.ceil(50 / 50)).toBe(1);
    expect(Math.ceil(51 / 50)).toBe(2);
    expect(source).toContain("RestoreListPosition");
    expect(filterSource).toContain("PreserveListPositionForm");
  });

  it("renders the latest issue list as compact two-line rows", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");
    const rowSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-row.tsx",
      "utf8",
    );
    const filterSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-filter-panel.tsx",
      "utf8",
    );
    const resultsSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-results.tsx",
      "utf8",
    );

    expect(source).toContain("IssueTrackingResults");
    expect(resultsSource).toContain("IssueTrackingRow");
    expect(rowSource).toContain("issue-row-two-line");
    expect(rowSource).toContain(
      "rounded-2xl border border-[var(--line)] bg-[var(--soft)]",
    );
    expect(rowSource).toContain("const rowId = `issue-row-${issue.id}`");
    expect(resultsSource).toContain('className="mt-4 grid gap-4"');
    expect(resultsSource).not.toContain(
      'className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)]"',
    );
    expect(rowSource).toContain("truncate");
    expect(resultsSource).toContain("buildIssueTrackingInspectHref");
    expect(resultsSource).toContain("inspectIssueId");
    expect(rowSource).toContain("PreserveListPositionLink");
    expect(rowSource).toContain("fixed inset-y-0 right-0 z-50");
    expect(rowSource).toContain("backdrop-blur-sm");
    expect(rowSource).toContain(
      'data-drawer-open={inspected ? "true" : undefined}',
    );
    const globalsSource = readFileSync("app/globals.css", "utf8");
    expect(globalsSource).toContain(
      '.issue-row-two-line[data-drawer-open="true"]',
    );
    expect(globalsSource).toContain("transition: none !important");
    expect(globalsSource).toContain("z-index: auto !important");
    expect(filterSource).toContain('data-testid="issue-filter-bar"');
  });

  it("keeps inventory kind inside the tracking filter form", () => {
    const source = readFileSync("app/dashboardstore/issue/page.tsx", "utf8");
    const filterSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-filter-panel.tsx",
      "utf8",
    );

    expect(source).not.toContain("IssueTrackingTabs");
    expect(source).not.toContain('role="tablist"');
    expect(filterSource).toContain("ชนิดรายการ");
    expect(filterSource).toContain(
      '<option value="SPARE_PART">อะไหล่</option>',
    );
    expect(filterSource).toContain('<option value="CHEMICAL">สารเคมี</option>');
    expect(filterSource).toContain('<option value="OIL">น้ำมัน</option>');
    expect(source).toContain("loadIssuePageData");
    expect(source).toContain("trackingQuery: parsedTrackingQuery");
    expect(filterSource).toContain("defaultValue={query.itemKind}");
    expect(filterSource).toContain('name="itemKind"');
  });

  it("offers the server-authorized issue document only after full issue", () => {
    const rowSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-row.tsx",
      "utf8",
    );

    expect(rowSource).toContain(
      "canPrintSparePartIssueDocument(viewer, issue)",
    );
    expect(rowSource).toContain("/dashboardstore/issue/${issue.id}/print");
    expect(rowSource).toContain("พิมพ์เอกสาร");
  });

  it("allows authorized Engineer and Store Officer flows to cancel and issue the whole request once", () => {
    const rowSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-row.tsx",
      "utf8",
    );
    const resultsSource = readFileSync(
      "app/dashboardstore/issue/issue-tracking-results.tsx",
      "utf8",
    );

    expect(resultsSource).toContain(
      "returnTo={`${closeHref}#issue-row-${issue.id}`}",
    );
    expect(rowSource).toContain("cancelIssueAction");
    expect(rowSource).toContain("IssueActionHiddenFields");
    expect(rowSource).toContain("canCancelIssue");
    expect(rowSource).toContain("ยกเลิกใบเบิก");
    expect(rowSource).toContain("จ่ายอะไหล่ทั้งใบ");
    expect(rowSource).not.toContain('name="issueQty"');
  });
});
