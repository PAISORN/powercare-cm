import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SiteAdminPermissionsPage", () => {
  it("is an owner admin page for configuring site admin checkbox permissions", () => {
    const source = readFileSync("app/admin/site-admin-permissions/page.tsx", "utf8");

    expect(source).toContain("canManageSiteAdminPermissions");
    expect(source).toContain("SITE_ADMIN_PERMISSION_OPTIONS");
    expect(source).toContain("db.siteAdminPermission");
    expect(source).toContain("permissionKey");
    expect(source).toContain("Site Admin Permissions");
    expect(source).not.toContain("Plant Admin Permissions");
  });

  it("renders permission groups with summaries and group select controls", () => {
    const pageSource = readFileSync("app/admin/site-admin-permissions/page.tsx", "utf8");
    const panelPath = "components/site-admin-permission-group-panel.tsx";

    expect(existsSync(panelPath)).toBe(true);
    const panelSource = readFileSync(panelPath, "utf8");
    expect(pageSource).toContain("SiteAdminPermissionGroupPanel");
    expect(pageSource).toContain("enabledCount");
    expect(panelSource).toContain("Select all");
    expect(panelSource).toContain("Clear group");
    expect(panelSource).toContain("enabledCount");
  });

  it("can scope the permission page to one selected site from the Sites page", () => {
    const source = readFileSync("app/admin/site-admin-permissions/page.tsx", "utf8");

    expect(source).toContain("organizationId?: string");
    expect(source).toContain("plantId?: string");
    expect(source).toContain("normalizeOrganizationId");
    expect(source).toContain("selectedPlant");
    expect(source).toContain("plantsForPermissions");
    expect(source).toContain("readOrganizationScope");
    expect(source).toContain("where: { id: selectedPlantId, organizationId }");
    expect(source).toContain("plantId: selectedPlant.id");
    expect(source).toContain("/admin/site-admin-permissions");
  });

  it("keeps the selected organization scope in both page load and save action", () => {
    const source = readFileSync("app/admin/site-admin-permissions/page.tsx", "utf8");

    expect(source).toContain("const scope = await readOrganizationScope()");
    expect(source).toContain("const organizationId = normalizeOrganizationId");
    expect(source).toContain("resolveActionOrganizationId");
    expect(source).toContain('name="returnOrganizationId"');
    expect(source).not.toContain("const organizationId = current.organizationId");
    expect(source).not.toContain("if (!organizationId) redirect(\"/dashboard\")");
  });

  it("provides a site filter and keeps unassigned Site Admins visible in all-site view", () => {
    const source = readFileSync("app/admin/site-admin-permissions/page.tsx", "utf8");

    expect(source).toContain('name="organizationId"');
    expect(source).toContain('AutoSubmitSelect name="plantId"');
    expect(source).toContain("allPlants.map((plant)");
    expect(source).toContain("OR: [{ plantId: { in: plantIdsForPermissions } }, { plantId: null }]");
    expect(source).toContain("Unassigned");
    expect(source).toContain("Manage user site");
    expect(source).not.toContain("Plant:");
    expect(source).not.toContain("ยังไม่ผูก Plant");
    expect(source).not.toContain("user plant");
  });

  it("includes site quota controls for user and work request limits", () => {
    const source = readFileSync("app/admin/site-admin-permissions/page.tsx", "utf8");

    expect(source).toContain("updateSiteQuota");
    expect(source).toContain('name="maxUsers"');
    expect(source).toContain('name="maxWorkRequests"');
    expect(source).toContain("Unlimited");
    expect(source).toContain("site-quota-form-grid");
    expect(source).not.toContain("sm:grid-cols-[1fr_120px_140px_auto]");
  });
});
