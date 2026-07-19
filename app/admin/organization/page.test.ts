import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin organization form", () => {
  it("lets React configure multipart encoding for the server action", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");
    expect(source).not.toContain('encType="multipart/form-data"');
  });

  it("includes editable organization and plant scope fields", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");
    expect(source).toContain("readOrganizationScope");
    expect(source).toContain("updateOrganizationScope");
    expect(source).toContain("updatePlantScope");
    expect(source).toContain('name="organizationName"');
    expect(source).toContain('name="organizationSlug"');
    expect(source).toContain('name="plantName"');
    expect(source).toContain('name="plantCode"');
    expect(source).toContain("plantName");
    expect(source).toContain("plantCode");
    expect(source).toContain("Site");
  });

  it("separates company organization permission from plant profile permission", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("canManageCompanyOrganization");
    expect(source).toContain("canManagePlantProfile");
    expect(source).toContain("const canEditCompany");
    expect(source).toContain("const canEditPlant");
    expect(source).toContain("disabled={!canEditCompany}");
  });

  it("lets a permitted Site Admin update its own Site profile and logo", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("canManagePlantProfile(user)");
    expect(source).toContain("savePlantLogoFile");
    expect(source).toContain("updatePlantProfile");
    expect(source).toContain('name={canEditCompany ? "logo" : "plantLogo"}');
    expect(source).toContain('name="siteCompanyName"');
  });

  it("reads organization scope from the signed-in user's organization and site", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("readOrganizationScopeForUser");
    expect(source).toContain("user.organizationId || DEFAULT_ORGANIZATION_ID");
    expect(source).toContain("where: { id: user.plantId }");
    expect(source).toContain("readOrganizationScopeForUser(user)");
  });

  it("renders a clickable organization site map", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");
    expect(source).toContain("OrganizationSiteMap");
    expect(source).toContain("totalSites");
    expect(source).toContain("db.organization.findMany");
    expect(source).toContain("organizationTree");
    expect(source).toContain("organizationTree={organizationTree}");
    expect(source).toContain("viewerRole={user.role}");
  });

  it("lets Owner Admin create organizations before assigning Organization Admin users", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("createOrganizationAction");
    expect(source).toContain("normalizeOrganizationRecordInput");
    expect(source).toContain("db.organization.create");
    expect(source).toContain("CREATE_ORGANIZATION");
    expect(source).toContain("Create Organization");
    expect(source).toContain("Organization created successfully");
    expect(source).not.toContain("initialCategories");
  });

  it("renders readable Thai copy instead of mojibake text", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("ข้อมูลองค์กร");
    expect(source).toContain("บันทึกข้อมูลองค์กรเรียบร้อยแล้ว");
    expect(source).not.toContain("à¸");
    expect(source).not.toContain("Â");
  });

  it("renders an organization chart hierarchy from owner admin to organization admins, site admins, and members", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("OrganizationSiteMap");
    expect(source).toContain("organizationTree={organizationTree}");
    expect(source).toContain("totalSites={totalSites}");
    expect(source).not.toContain("subtitle={scope.organization.name}");
  });

  it("passes inline user drawer permissions and update action to the organization map", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("updateOrganizationMapUserAction");
    expect(source).toContain("updateUserAction={updateOrganizationMapUserAction}");
    expect(source).toContain("drawerCategories");
    expect(source).toContain("drawerPlants");
    expect(source).toContain("userPermissions");
    expect(source).toContain("canUpdateManagedUser");
  });

  it("passes a create user action so empty admin slots can create users from the organization map", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain("createOrganizationMapUserAction");
    expect(source).toContain("createUserAction={createOrganizationMapUserAction}");
    expect(source).toContain("canCreateManagedUser");
    expect(source).toContain("CREATE_USER");
    expect(source).toContain("userStatus=created");
  });

  it("exposes Store Officer as a site-scoped manageable user role", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");

    expect(source).toContain('{ value: RoleName.STORE_OFFICER, label: "Store Officer" }');
  });
});
