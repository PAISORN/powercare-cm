import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin announcements permission", () => {
  it("checks permissions with the signed-in user context instead of role strings", () => {
    const source = readFileSync("app/admin/announcements/page.tsx", "utf8");

    expect(source).toContain("canManageAnnouncements(user)");
    expect(source).not.toContain("canManageAnnouncements(user.role");
    expect(source).not.toContain("RoleName");
  });
});
