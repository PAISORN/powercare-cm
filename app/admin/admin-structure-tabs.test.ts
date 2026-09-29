import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin structure tabs", () => {
  it("provides a shared tab bar for organization, sites, and users", () => {
    const source = readFileSync("components/admin-structure-tabs.tsx", "utf8");

    expect(source).toContain("/admin/organization");
    expect(source).toContain("/admin/sites");
    expect(source).toContain("/admin/users");
    expect(source).toContain("Organization");
    expect(source).toContain("Sites");
    expect(source).toContain("Users");
  });

  it("renders the shared tab bar on all structure management pages", () => {
    const organization = readFileSync(
      "components/admin-organization-page/admin-organization-workspace.tsx",
      "utf8",
    );
    const sites = readFileSync("app/admin/sites/page.tsx", "utf8");
    const users = readFileSync(
      "components/admin-users-page/admin-users-workspace.tsx",
      "utf8",
    );

    expect(organization).toContain("AdminStructureTabs");
    expect(organization).toContain('activeTab="organization"');
    expect(sites).toContain("AdminStructureTabs");
    expect(sites).toContain('activeTab="sites"');
    expect(users).toContain("AdminStructureTabs");
    expect(users).toContain('activeTab="users"');
  });

  it("keeps the Owner Admin organization create form visible on the organization tab", () => {
    const source = [
      "app/admin/organization/actions.ts",
      "components/admin-organization-page/admin-organization-workspace.tsx",
    ].map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).toContain("createOrganizationAction");
    expect(source).toContain('aria-label="Create organization"');
    expect(source).toContain("Create Organization");
  });
});
