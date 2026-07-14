import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin users plant scope", () => {
  it("loads active plants for the create and edit user forms", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");
    expect(source).toContain("getActivePlantsForScope(formOrganizationId)");
    expect(source).toContain("const [users, categories, plants, scope, formOrganization, createFormPlants, createFormCategories]");
    expect(source).toContain("formOrganization?.name");
    expect(source).toContain("include: { category: true, categories: { include: { category: true } }, plant: true");
    expect(source).toContain('name="categoryIds"');
    expect(source).toContain('name="plantId"');
    expect(source).toContain("filteredUserWhere");
  });

  it("saves plantId when creating and updating users", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");
    expect(source).toContain("resolveManagedUserPlantId(current");
    expect(source).toContain("plantId: created.plantId");
    expect(source).toContain("plantId: before.plantId");
    expect(source).toContain("plantId: updated.plantId");
  });

  it("renders plant selectors and current plant information", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");
    expect(source).toContain('select name="plantId"');
    expect(source).toContain("visiblePlants.map((plant)");
    expect(source).toContain("item.plant?.name");
    expect(source).toContain("Site:");
    expect(source).toContain("ไม่ผูก Site");
    expect(source).not.toContain("<span>Plant:");
    expect(source).not.toContain(">Plant<");
    expect(source).not.toContain("ไม่ผูก Plant");
    expect(source).toContain('label: "Site Admin"');
    expect(source).not.toContain('label: "Plant Admin"');
  });

  it("allows Site Admin to manage only scoped non-admin users", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");
    expect(source).toContain("canManageUsers");
    expect(source).toContain("getManageableUserWhere(user)");
    expect(source).toContain("assertManagedUserRole(current");
    expect(source).toContain("assertCanManageTargetUser(current, before)");
    expect(source).toContain("getPlantsForUserManager(user, plants)");
  });

  it("uses granular user management permissions for forms and server actions", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");
    for (const helper of [
      "canCreateManagedUser",
      "canUpdateManagedUser",
      "canResetManagedUserPassword",
      "canAssignManagedUserRole",
      "canAssignManagedUserPlant",
      "canAssignManagedUserCategories",
      "canDeactivateManagedUser",
      "canDeleteManagedUser",
    ]) {
      expect(source).toContain(helper);
    }
    expect(source).toContain("const userPermissions =");
    expect(source).toContain("userPermissions.canCreate");
    expect(source).toContain("userPermissions.canDelete");
    expect(source).toContain("userPermissions.canAssignCategories");
    expect(source).toContain("RoleName.ORGANIZATION_ADMIN");
  });

  it("uses compact reveal cards with clickable edit details for admin users", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");

    expect(source).toContain('id={`user-${item.id}`}');
    expect(source).toContain("reveal-on-scroll");
    expect(source).toContain("<details");
    expect(source).toContain("<summary");
    expect(source).toContain("rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5");
  });

  it("renders category assignment as checkbox permissions instead of an overflowing multi-select", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");

    expect(source).toContain("CategoryCheckboxList");
    expect(source).toContain("user-edit-single-column-grid");
    expect(source).toContain("user-edit-file-grid");
    expect(source).toContain('type="checkbox"');
    expect(source).toContain('name="categoryIds"');
    expect(source).not.toContain("multiple defaultValue={getUserCategoryIds(item)}");
    expect(source).not.toContain("lg:grid-cols-[1fr_1fr_1fr_1fr_auto]");
  });

  it("does not expose the fixed Owner Admin role in user create or edit dropdowns", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");

    expect(source).not.toContain('{ value: RoleName.ADMIN, label: "Admin" }');
    expect(source).toContain('{ value: RoleName.ORGANIZATION_ADMIN, label: "Organization Admin" }');
  });

  it("exposes Store Officer as a site-scoped manageable user role", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");
    const labelsSource = readFileSync("modules/users/role-labels.ts", "utf8");

    expect(source).toContain('{ value: RoleName.STORE_OFFICER, label: "Store Officer" }');
    expect(labelsSource).toContain('[RoleName.STORE_OFFICER]: "Store Officer"');
  });

  it("adds role and site filters while keeping Organization Admin above site scope", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");

    expect(source).toContain("role?: string");
    expect(source).toContain("organizationId?: string");
    expect(source).toContain("normalizeOrganizationFilter(requestedOrganizationId, organizations)");
    expect(source).toContain("getRoleFilterOptionsForUserManager(user.role)");
    expect(source).toContain("applyUserDirectoryFilters(");
    expect(source).toContain("userWhere,");
    expect(source).toContain("selectedRole,");
    expect(source).toContain("Role / Level");
    expect(source).toContain("Organization");
    expect(source).toContain('name="role"');
    expect(source).toContain("selectedRole === RoleName.ORGANIZATION_ADMIN");
  });

  it("creates Organization Admin only under an existing organization without site or category", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");

    expect(source).toContain("AdminUserRoleScopeController");
    expect(source).toContain("db.organization.findUnique");
    expect(source).toContain('name="organizationId"');
    expect(source).not.toContain("db.organization.create");
    expect(source).not.toContain("organizationNameInput");
    expect(source).toContain("normalizeManagedUserDepartment(nextRole, formData, organizationName)");
    expect(source).toContain("nextRole === RoleName.ORGANIZATION_ADMIN");
    expect(source).toContain("plantId = nextRole === RoleName.ORGANIZATION_ADMIN");
    expect(source).toContain("selectedCategoryIds = nextRole === RoleName.ORGANIZATION_ADMIN");
    expect(source).toContain("ถ้าเลือก Organization Admin ระบบจะใช้หน่วยงานเป็นชื่อองค์กร");
  });

  it("defaults new users to Technician so normal site user fields stay editable", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");

    expect(source).toContain("const defaultCreateUserRole = RoleName.TECHNICIAN");
    expect(source).toContain("defaultValue={defaultCreateUserRole}");
  });

  it("reloads create-user site choices when Owner Admin selects a different organization", () => {
    const pageSource = readFileSync("app/admin/users/page.tsx", "utf8");
    const controllerSource = readFileSync("components/admin-user-role-scope-controller.tsx", "utf8");

    expect(pageSource).toContain("createFormPlants");
    expect(pageSource).toContain("createFormCategories");
    expect(pageSource).toContain('data-filters-scope-options="true"');
    expect(pageSource).toContain("data-organization-id={plant.organizationId}");
    expect(pageSource).toContain("data-category-organization-id");
    expect(pageSource).toContain("getActivePlantsForScope(formOrganizationId)");
    expect(pageSource).toContain("assertCategoriesInsidePlant(selectedCategoryIds, plantId)");
    expect(controllerSource).toContain("reloadsSiteOptions");
    expect(controllerSource).toContain("filtersScopeOptions");
    expect(controllerSource).toContain("filterScopeOptions");
    expect(controllerSource).toContain("searchParams.set(\"organizationId\"");
    expect(controllerSource).toContain("window.location.href");
  });

  it("lets Owner Admin change organization directly inside edit user cards", () => {
    const source = readFileSync("app/admin/users/page.tsx", "utf8");

    expect(source).toContain("editFormPlants");
    expect(source).toContain("editFormCategories");
    expect(source).toContain("data-edit-user-organization-scope");
    expect(source).toContain('defaultValue={item.organizationId ?? formOrganizationId}');
    expect(source).toContain("{editFormPlants.map((plant)");
    expect(source).toContain("CategoryCheckboxList categories={editFormCategories}");
    expect(source).not.toContain('user.role === RoleName.ADMIN ? <input name="organizationId" type="hidden" value={item.organizationId ?? formOrganizationId} /> : null');
  });
});
