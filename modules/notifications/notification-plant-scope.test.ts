import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("notification plant scope", () => {
  it("limits notification reads and summaries to CM work IDs in the user's operational scope", () => {
    const source = readFileSync("modules/notifications/notification-service.ts", "utf8");

    expect(source).toContain("scope?: OperationalScope");
    expect(source).toContain("getScopedNotificationWorkFilter(scope)");
    expect(source).toContain("buildNotificationWorkWhere(scope)");
    expect(source).toContain("organizationId: scope.organizationId");
    expect(source).toContain("plantId: scope.plantId");
    expect(source).toContain("entityId: { in: workIds }");
    expect(source).toContain("entityId: { in: scopedWorkIds }");
    expect(source).toContain("markAllNotificationsRead(userId: string, scope?: OperationalScope)");
  });

  it("creates CM notifications for users in the work plant scope", () => {
    const source = readFileSync("modules/notifications/notification-service.ts", "utf8");
    const typeSource = readFileSync("modules/notifications/notification-types.ts", "utf8");
    const cmWorkSource = readFileSync("modules/cm-work/cm-work-service.ts", "utf8");

    expect(typeSource).toContain("plantId: string | null");
    expect(typeSource).toContain("organizationId: string | null");
    expect(source).toContain("plantId: event.plantId");
    expect(source).toContain("{ role: RoleName.ADMIN }");
    expect(source).toContain("{ role: RoleName.ORGANIZATION_ADMIN, organizationId: event.organizationId }");
    expect(source).toContain("{ role: { in: [...SITE_ADMIN_ROLE_VALUES] }, plantId: event.plantId }");
    expect(source).toContain("{ categoryId: event.categoryId, plantId: event.plantId }");
    expect(cmWorkSource).toContain("plantId: work.plantId");
    expect(cmWorkSource).toContain("organizationId: work.organizationId");
  });
});
