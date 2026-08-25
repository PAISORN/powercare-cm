import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Activities page", () => {
  it("exists and lists current user action items", () => {
    expect(existsSync("app/activities/page.tsx")).toBe(true);
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("My Activities");
    expect(source).toContain("activityFeedToneClass");
    expect(source).toContain("activity-tone-blue");
    expect(source).toContain("activity-tone-violet");
    expect(source).toContain("activity-board-card group relative block h-36 w-full");
    expect(source).toContain("activity-board-icon");
    expect(source).toContain("requireUser");
    expect(source).toContain("WAITING_TO_CLOSE");
    expect(source).toContain("CLAIMED");
    expect(source).toContain("IN_PROGRESS");
  });

  it("keeps activity queries scoped by selected site and review permission", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("resolveStorePageScope");
    expect(source).toContain("AdminSiteScopeSelector");
    expect(source).toContain("const scope = await resolveStorePageScope(user, query)");
    expect(source).toContain("plantId: scope.plant.id");
    expect(source).toContain("canCloseWork(actor, work)");
  });

  it("keeps shutdown backlog work out of My Activities", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");
    const activeStatuses = source.slice(
      source.indexOf("const ACTIVE_OWNER_STATUSES"),
      source.indexOf("const PENDING_STORE_ISSUE_STATUSES"),
    );
    expect(activeStatuses).not.toContain("WorkStatus.BACKLOG_SHUTDOWN");
  });

  it("shows chemical approval activities for scoped engineers including public requesters", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");
    expect(source).toContain("itemKind: { in: approvalKinds }");
    expect(source).toContain("{ requesterUserId: null }");
    expect(source).toContain("{ requesterUserId: { not: user.id } }");
  });

  it("renders readable Thai copy instead of mojibake text", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("???????????????????");
    expect(source).toContain("????????????/??????");
    expect(source).toContain("??????? Store / ????????????");
    expect(source).not.toContain("?");
    expect(source).not.toContain("�");
    expect(source).not.toContain("�");
  });

  it("splits store activity queues by next role action", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("WAITING_ENGINEER_APPROVAL");
    expect(source).toContain("WAITING_STORE_ISSUE");
    expect(source).toContain("PARTIALLY_ISSUED");
    expect(source).toContain("RETURNED_FOR_EDIT");
    expect(source).toContain("NOT_ENOUGH_STOCK");
    expect(source).toContain("?? Engineer ???????");
    expect(source).toContain("?? Store ????");
    expect(source).toContain("??????????????? / ????????");
  });

  it("renders store workflow action controls directly in My Activities", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("engineerDecisionFromActivity");
    expect(source).toContain("issueStockFromActivity");
    expect(source).toContain("notEnoughStockFromActivity");
    expect(source).toContain("APPROVE");
    expect(source).toContain("RETURN");
    expect(source).toContain("REJECT");
    expect(source).toContain("Not enough stock");
    expect(source).toContain("????????????????");
    expect(source).not.toContain('name="issueQty"');
  });

  it("combines CM and Store tasks into one compact activity feed", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("combinedActivities");
    expect(source).toContain("UnifiedActivityList");
    expect(source).toContain("ActivityFeedRow");
    expect(source).toContain("activity-row-two-line");
    expect(source).not.toContain("storeSections.map((section)");
  });

  it("keeps both list and card views available without summary metrics", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain('query.activityView === "current" ? "current" : "visual"');
    expect(source).toContain("divide-y divide-[var(--line)]");
    expect(source).toContain("activity-row-two-line group transition");
    expect(source).toContain("ActivityViewToggle");
    expect(source).toContain("ActivityBoardView");
    expect(source).toContain('label: "??????"');
    expect(source).toContain('label: "?????"');
    expect(source).not.toContain("<ActivityMetric");
  });

  it("opens activity work directly in a right-side action drawer instead of navigating away", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("selectedActivity");
    expect(source).toContain("ActivityActionDrawer");
    expect(source).toContain("activity-action-drawer");
    expect(source).toContain("activitySelectionHref");
    expect(source).toContain("selectedItem");
    expect(source).toContain("activityCloseHref");
    expect(source).toContain("??????????????????");
    expect(source).toContain("query.selectedActivity");
    expect(source).not.toContain("filteredBoardActivities[0]");
    expect(source).not.toContain('href={href}');
  });
});
