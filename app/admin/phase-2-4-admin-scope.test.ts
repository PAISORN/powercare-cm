import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("phase 2.4 admin pages scope", () => {
  it("uses current organization, audit, feedback, and LINE access scopes", () => {
    const history = readFileSync("app/admin/history/page.tsx", "utf8");
    const announcements = readFileSync("app/admin/announcements/page.tsx", "utf8");
    const feedback = readFileSync("app/admin/feedback/page.tsx", "utf8");
    const line = readFileSync("app/admin/line/page.tsx", "utf8");

    expect(history).toContain("buildAuditEventScopeWhere");
    expect(history).toContain("where: { action: { in: trackedActions }, ...auditScopeWhere }");
    expect(announcements).not.toContain("readOrganizationScope");
    expect(announcements).toContain("organizationId: null");
    expect(feedback).toContain("canManageFeedback(user)");
    expect(feedback).toContain("db.publicFeedback.findMany");
    expect(feedback).toContain("organizationId: null, plantId: null");
    expect(line).toContain("resolveAdminSiteScope");
    expect(line).toContain("organizationId: scope.organization.id");
  });
});
