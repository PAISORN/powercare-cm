import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import {
  applyUserDirectoryFilters,
  buildAdminUsersReturnHref,
  getOrganizationMapRoleOptions,
  getPlantsForUserManager,
  getRoleFilterOptionsForUserManager,
  normalizeOrganizationFilter,
  normalizeRoleFilter,
} from "./admin-user-page-model";

describe("admin user page model", () => {
  it("limits role filters and organization-map roles to the manager scope", () => {
    expect(
      getRoleFilterOptionsForUserManager(RoleName.SITE_ADMIN).map(
        (option) => option.value,
      ),
    ).not.toEqual(
      expect.arrayContaining([RoleName.ORGANIZATION_ADMIN, RoleName.SITE_ADMIN]),
    );
    expect(
      getOrganizationMapRoleOptions(RoleName.ORGANIZATION_ADMIN).map(
        (option) => option.value,
      ),
    ).not.toContain(RoleName.ORGANIZATION_ADMIN);
  });

  it("validates organization and role filters against visible options", () => {
    expect(normalizeOrganizationFilter("org-b", [{ id: "org-a" }])).toBe("");
    expect(
      normalizeRoleFilter(RoleName.ENGINEER, [
        { value: RoleName.ENGINEER, label: "Engineer" },
      ]),
    ).toBe(RoleName.ENGINEER);
  });

  it("does not apply a Site filter to Organization Admin rows", () => {
    expect(
      applyUserDirectoryFilters(
        { active: true },
        RoleName.ORGANIZATION_ADMIN,
        "plant-a",
        "org-a",
      ),
    ).toEqual({
      active: true,
      organizationId: "org-a",
      role: RoleName.ORGANIZATION_ADMIN,
    });
    expect(
      getPlantsForUserManager(
        { role: RoleName.SITE_ADMIN, plantId: "plant-a" },
        [{ id: "plant-a" }, { id: "plant-b" }],
      ),
    ).toEqual([{ id: "plant-a" }]);
  });

  it("preserves active filters in the post-save return URL", () => {
    expect(
      buildAdminUsersReturnHref({
        organizationId: "org 1",
        role: RoleName.ENGINEER,
        plantId: "plant/1",
      }),
    ).toBe(
      "/admin/users?organizationId=org+1&role=ENGINEER&plantId=plant%2F1",
    );
  });
});
