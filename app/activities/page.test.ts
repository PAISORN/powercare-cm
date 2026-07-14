import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Activities page", () => {
  it("exists and lists current user action items", () => {
    expect(existsSync("app/activities/page.tsx")).toBe(true);
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("My Activities");
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

  it("renders readable Thai copy instead of mojibake text", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("งานที่ต้องดำเนินการ");
    expect(source).toContain("ควรอัปเดตงาน");
    expect(source).toContain("งานรอตรวจรับ/ปิดงาน");
    expect(source).toContain("กิจกรรม Store / ใบเบิกอะไหล่");
    expect(source).not.toContain("à¸");
    expect(source).not.toContain("Ã Â¸");
    expect(source).not.toContain("Ãƒ");
  });

  it("splits store activity queues by next role action", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("WAITING_ENGINEER_APPROVAL");
    expect(source).toContain("WAITING_STORE_ISSUE");
    expect(source).toContain("PARTIALLY_ISSUED");
    expect(source).toContain("RETURNED_FOR_EDIT");
    expect(source).toContain("NOT_ENOUGH_STOCK");
    expect(source).toContain("รอ Engineer อนุมัติ");
    expect(source).toContain("รอ Store จ่าย");
    expect(source).toContain("ส่งกลับให้แก้ไข / ของไม่พอ");
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
    expect(source).toContain("issueQty");
  });

  it("combines CM and Store tasks into one compact activity feed", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("combinedActivities");
    expect(source).toContain("UnifiedActivityList");
    expect(source).toContain("ActivityFeedRow");
    expect(source).toContain("activity-row-two-line");
    expect(source).not.toContain("storeSections.map((section)");
  });

  it("lets users switch all activities between the current list and a visual card view", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("activityView");
    expect(source).toContain("ActivityViewToggle");
    expect(source).toContain("LayoutGrid");
    expect(source).toContain("List view");
    expect(source).toContain("Card view");
    expect(source).toContain("ActivityBoardView");
    expect(source).toContain("activity-board-toolbar");
    expect(source).toContain("activity-board-card");
    expect(source).toContain("activity-board-tabs");
    expect(source).toContain("activityBoardRedirect");
  });

  it("opens activity work directly in a right-side action drawer instead of navigating away", () => {
    const source = readFileSync("app/activities/page.tsx", "utf8");

    expect(source).toContain("selectedActivity");
    expect(source).toContain("ActivityActionDrawer");
    expect(source).toContain("activity-action-drawer");
    expect(source).toContain("activitySelectionHref");
    expect(source).toContain("selectedItem");
    expect(source).toContain("activityCloseHref");
    expect(source).toContain("ดำเนินการในหน้านี้");
    expect(source).toContain("query.selectedActivity");
    expect(source).not.toContain("filteredBoardActivities[0]");
    expect(source).not.toContain('href={href}');
  });
});
