import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("notifications page plant scope", () => {
  it("passes the signed-in user's operational scope to notification listing and count", () => {
    const page = readFileSync("app/notifications/page.tsx", "utf8");
    const readRoute = readFileSync("app/notifications/read/route.ts", "utf8");
    const readAllRoute = readFileSync("app/notifications/read-all/route.ts", "utf8");

    expect(page).toContain("buildUserOperationalScope");
    expect(page).toContain("const scope = buildUserOperationalScope(user)");
    expect(page).toContain("listNotifications(user.id, 1, 50, scope)");
    expect(page).toContain("getUnreadCount(user.id, scope)");
    expect(readRoute).toContain("buildUserOperationalScope");
    expect(readRoute).toContain("markNotificationRead(user.id, notification.id, scope)");
    expect(readAllRoute).toContain("buildUserOperationalScope");
    expect(readAllRoute).toContain("markAllNotificationsRead(user.id, scope)");
  });
});
