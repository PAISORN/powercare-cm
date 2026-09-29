import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SiteAdminPermissionsRedirect", () => {
  const source = readFileSync("app/admin/site-admin-permissions/page.tsx", "utf8");

  it("redirects the retired page to the unified Permission Center", () => {
    expect(source).toContain('new URLSearchParams({ mode: "user" })');
    expect(source).toContain("/admin/permissions?");
    expect(source).not.toContain("LegacySiteAdminPermissionsPage");
    expect(source).not.toContain("db.siteAdminPermission");
  });

  it("preserves organization and site selection from old links", () => {
    expect(source).toContain('params.set("organizationId", query.organizationId)');
    expect(source).toContain('params.set("plantId", query.plantId)');
  });
});
