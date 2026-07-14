import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/admin/line/page.tsx", "utf8");

describe("admin LINE settings page", () => {
  it("offers an immediate LINE daily report test action", () => {
    expect(source).toContain("sendDailyReportNowAction");
    expect(source).toContain("dispatchLineDailyReport");
    expect(source).toContain("force: true");
    expect(source).toContain("eventIdSuffix");
    expect(source).toContain("ส่งรายงาน LINE ทดสอบตอนนี้");
    expect(source).toContain("dailyReportTested");
    expect(source).toContain("dailyReportSkipped");
  });

  it("passes Site Admin checkbox permissions into LINE settings service calls", () => {
    expect(source).toContain("siteAdminPermissions");
    expect(source).toContain("siteAdminPermissions: user.siteAdminPermissions");
    expect(source).toContain("canManageLineSettings(user)");
    expect(source).toContain("canTestLineMessaging(user)");
    expect(source).toContain("canSendLineTest");
  });

  it("scopes LINE destinations and delivery history by the selected admin site", () => {
    expect(source).toContain("resolveUserOperationalPlantId");
    expect(source).toContain("resolveAdminSiteScope(user, query)");
    expect(source).toContain("const plantId = scope.plant.id || resolveUserOperationalPlantId(user)");
    expect(source).toContain("<AdminSiteScopeSelector");
    expect(source).toContain("listLineDestinations(scope.organization.id, plantId)");
    expect(source).toContain("listLineDeliveryHistory(scope.organization.id, 50, plantId)");
    expect(source).toContain("<AdminScopeHiddenFields scope={scope} />");
  });
});
