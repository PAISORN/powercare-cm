import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("members page plant scope", () => {
  it("uses operational scope for member listing and workload", () => {
    const source = readFileSync("app/members/page.tsx", "utf8");

    expect(source).toContain("buildUserOperationalScope");
    expect(source).toContain("resolveAdminSiteScope(user");
    expect(source).toContain("const scope = adminScope ? { plantId: adminScope.plant.id } : buildUserOperationalScope(user)");
    expect(source).toContain("getMembers({ viewerRole: user.role, category, dateFilter, scope })");
  });

  it("lets owner admins filter members by site", () => {
    const source = readFileSync("app/members/page.tsx", "utf8");

    expect(source).toContain('user.role === "ADMIN" || user.role === "ORGANIZATION_ADMIN"');
    expect(source).toContain("AdminSiteScopeSelector");
    expect(source).toContain('name="plantId"');
    expect(source).toContain("params.plantId");
  });
});
