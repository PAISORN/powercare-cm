import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin Sites page", () => {
  it("manages plants inside the current organization scope only", () => {
    const source = readFileSync("app/admin/sites/page.tsx", "utf8");

    expect(source).toContain("canManageSites");
    expect(source).toContain("resolveManageableOrganization");
    expect(source).toContain("organizationId: organization.id");
    expect(source).toContain("normalizePlantRecordInput");
    expect(source).toContain("initialZones");
    expect(source).toContain("db.plant.create");
    expect(source).toContain("db.zone.createMany");
    expect(source).toContain("db.plant.findFirstOrThrow");
    expect(source).toContain("include: { _count: { select: { users: true, works: true, zones: true } } }");
    expect(source).toContain("CREATE_SITE");
    expect(source).toContain("defaultZones: initialZones");
    expect(source).toContain("ACTIVATE_SITE");
    expect(source).toContain("DEACTIVATE_SITE");
  });

  it("lets Owner Admin choose an organization and keeps Organization Admin scoped to their own organization", () => {
    const source = readFileSync("app/admin/sites/page.tsx", "utf8");

    expect(source).toContain("organizationId?: string");
    expect(source).toContain("user.role === RoleName.ADMIN");
    expect(source).toContain("select name=\"organizationId\"");
    expect(source).toContain('input name="organizationId" type="hidden" value={organization.id}');
    expect(source).toContain("siteListPath");
  });

  it("lets Owner Admin choose the target organization inside the create site form", () => {
    const source = readFileSync("app/admin/sites/page.tsx", "utf8");

    expect(source).toContain('aria-label="Create site"');
    expect(source).toContain('data-create-site-organization');
    expect(source).toContain("Create this Site under");
    expect(source).toContain("organizations.map((item)");
  });

  it("links each site to scoped Site Admin permission management", () => {
    const source = readFileSync("app/admin/sites/page.tsx", "utf8");

    expect(source).toContain("SITE_ADMIN_ROLE_VALUES");
    expect(source).toContain("siteAdminCountByPlantId");
    expect(source).toContain("Site Admins");
    expect(source).toContain("Manage Site Admins");
    expect(source).toContain("/admin/site-admin-permissions?organizationId=");
  });

  it("lets super admin edit site names and site quota limits", () => {
    const source = readFileSync("app/admin/sites/page.tsx", "utf8");

    expect(source).toContain("updateSiteDetails");
    expect(source).toContain('name="name"');
    expect(source).toContain('name="code"');
    expect(source).toContain('name="maxUsers"');
    expect(source).toContain('name="maxWorkRequests"');
    expect(source).toContain("UPDATE_SITE_DETAILS");
  });
});
