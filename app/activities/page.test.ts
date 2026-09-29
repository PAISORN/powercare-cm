import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Activities page", () => {
  const source = [
    "app/activities/page.tsx",
    "app/activities/actions.ts",
    "components/activities-page/activities-workspace.tsx",
    "components/activities-page/activity-board.tsx",
    "components/activities-page/activity-action-drawer.tsx",
    "modules/activities/activity-page-data.ts",
    "modules/activities/activity-page-model.ts",
  ]
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  it("exists and lists current user action items", () => {
    expect(existsSync("app/activities/page.tsx")).toBe(true);

    expect(source).toContain("My Activities");
    expect(source).toContain("activityFeedToneClass");
    expect(source).toContain("activity-tone-blue");
    expect(source).toContain("activity-tone-violet");
    expect(source).toContain(
      "activity-board-card dashboard-kpi dashboard-kpi-glow group relative block h-36 w-full",
    );
    expect(source).toContain("activity-board-icon");
    expect(source).toContain("requireUser");
    expect(source).toContain(
      "canUseUserPermission(user, PermissionKey.VIEW_MY_ACTIVITIES)",
    );
    expect(source).toContain("redirect(defaultHomeHref(user))");
    expect(source).toContain("WAITING_TO_CLOSE");
    expect(source).toContain("CLAIMED");
    expect(source).toContain("IN_PROGRESS");
  });

  it("keeps activity queries scoped by selected site and review permission", () => {
    expect(source).toContain("resolveStorePageScope");
    expect(source).toContain("AdminSiteScopeSelector");
    expect(source).toContain(
      "const scope = await resolveStorePageScope(user, query)",
    );
    expect(source).toContain("plantId: scope.plant.id");
    expect(source).toContain("canCloseWork(actor, work)");
  });

  it("loads CM and Store activity queues only when their My Activities permissions allow them", () => {
    expect(source).toContain("PermissionKey.VIEW_MY_ACTIVITIES_CM");
    expect(source).toContain("PermissionKey.VIEW_MY_ACTIVITIES_STORE");
    expect(source).toMatch(/canViewCmActivities\s*\?\s*db\.cmWork\.findMany/);
    expect(source).toMatch(
      /canViewStoreActivities\s*\?\s*db\.sparePartIssue\.findMany/,
    );
    expect(source).toMatch(
      /const canApproveStore\s*=\s*canViewStoreActivities\s*&&/,
    );
    expect(source).toMatch(
      /const canIssueStore\s*=\s*canViewStoreActivities\s*&&/,
    );
  });

  it("keeps shutdown backlog work out of My Activities", () => {
    const activeStatuses = source.slice(
      source.indexOf("const ACTIVE_OWNER_STATUSES"),
      source.indexOf("const PENDING_STORE_ISSUE_STATUSES"),
    );
    expect(activeStatuses).not.toContain("WorkStatus.BACKLOG_SHUTDOWN");
  });

  it("shows chemical approval activities for scoped engineers including public requesters", () => {
    expect(source).toContain("itemKind: { in: approvalKinds }");
    expect(source).toContain("{ requesterUserId: null }");
    expect(source).toContain("{ requesterUserId: { not: user.id } }");
  });

  it("renders readable Thai copy instead of mojibake text", () => {
    expect(source).toContain("งานที่ต้องดำเนินการ");
    expect(source).toContain("งานรอตรวจรับ/ปิดงาน");
    expect(source).toContain("กิจกรรม Store / ใบเบิกอะไหล่");
    expect(source).not.toContain("�");
    expect(source).not.toContain("�");
  });

  it("splits store activity queues by next role action", () => {
    expect(source).toContain("WAITING_ENGINEER_APPROVAL");
    expect(source).toContain("WAITING_STORE_ISSUE");
    expect(source).toContain("PARTIALLY_ISSUED");
    expect(source).toContain("RETURNED_FOR_EDIT");
    expect(source).toContain("NOT_ENOUGH_STOCK");
    expect(source).toContain("รอ Engineer อนุมัติ");
    expect(source).toContain("รอ Store จ่าย");
    expect(source).toContain("ส่งกลับให้แก้ไข");
  });

  it("renders store workflow action controls directly in My Activities", () => {
    expect(source).toContain("engineerDecisionFromActivity");
    expect(source).toContain("issueStockFromActivity");
    expect(source).toContain("notEnoughStockFromActivity");
    expect(source).toContain("APPROVE");
    expect(source).toContain("RETURN");
    expect(source).toContain("REJECT");
    expect(source).toContain("Not enough stock");
    expect(source).toContain("ยกเลิกใบเบิก");
    expect(source).not.toContain('name="issueQty"');
  });

  it("combines CM and Store tasks into one compact activity feed", () => {
    expect(source).toContain("combinedActivities");
    expect(source).toContain("UnifiedActivityList");
    expect(source).toContain("ActivityFeedRow");
    expect(source).toContain("activity-row-two-line");
    expect(source).not.toContain("storeSections.map((section)");
  });

  it("keeps both list and card views available without summary metrics", () => {
    expect(source).toContain(
      'query.activityView === "current" ? "current" : "visual"',
    );
    expect(source).toContain("divide-y divide-[var(--line)]");
    expect(source).toContain("activity-row-two-line group transition");
    expect(source).toContain("ActivityViewToggle");
    expect(source).toContain("ActivityBoardView");
    expect(source).toContain('label: "รายการ"');
    expect(source).toContain('label: "การ์ด"');
    expect(source).not.toContain("<ActivityMetric");
    expect(source).toContain("dashboard-kpi dashboard-kpi-glow");
    expect(source).toContain('"--kpi-color": "#3b82f6"');
  });

  it("opens activity work directly in a right-side action drawer instead of navigating away", () => {
    expect(source).toContain("selectedActivity");
    expect(source).toContain("ActivityActionDrawer");
    expect(source).toContain("activity-action-drawer");
    expect(source).toContain("activitySelectionHref");
    expect(source).toContain("selectedItem");
    expect(source).toContain("activityCloseHref");
    expect(source).toContain("ดำเนินการในหน้านี้");
    expect(source).toContain("query.selectedActivity");
    expect(source).not.toContain("filteredBoardActivities[0]");
    expect(source).not.toContain("href={href}");
  });
});
