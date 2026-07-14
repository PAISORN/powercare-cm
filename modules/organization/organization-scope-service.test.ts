import { describe, expect, it, vi } from "vitest";
import { PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import {
  readOrganizationScope,
  updatePlantScope,
  updateOrganizationScope,
  type OrganizationScopeStore,
} from "./organization-scope-service";

function store(): OrganizationScopeStore {
  return {
    read: vi.fn(async () => null),
    update: vi.fn(async (input) => ({
      organization: { id: "primary", name: input.organizationName, slug: input.organizationSlug },
      plant: { id: "primary-plant", name: input.plantName, code: input.plantCode },
    })),
    updatePlant: vi.fn(async (input) => ({
      organization: { id: "primary", name: "Power Care.CM", slug: "powercare-cm" },
      plant: { id: "primary-plant", name: input.plantName, code: input.plantCode },
    })),
  };
}

describe("organization scope service", () => {
  it("returns the default organization and plant before setup is customized", async () => {
    const scope = await readOrganizationScope(store());

    expect(scope.organization.name).toBe("Power Care.CM");
    expect(scope.plant.name).toBe("Main Plant");
  });

  it("lets Admin update the default organization and plant scope", async () => {
    const scopeStore = store();

    await updateOrganizationScope(
      { id: "admin", role: RoleName.ADMIN, categoryId: null },
      {
        organizationName: " บริษัท ไพร์ซ ออฟ วู๊ด กรีน เอเนอร์จี จำกัด ",
        organizationSlug: " Power Plant ",
        plantName: " โรงไฟฟ้า ไพร์ซ ออฟ วู๊ด ",
        plantCode: " Plant 01 ",
      },
      scopeStore,
    );

    expect(scopeStore.update).toHaveBeenCalledWith(
      {
        organizationName: "บริษัท ไพร์ซ ออฟ วู๊ด กรีน เอเนอร์จี จำกัด",
        organizationSlug: "power-plant",
        plantName: "โรงไฟฟ้า ไพร์ซ ออฟ วู๊ด",
        plantCode: "plant-01",
      },
      "admin",
    );
  });

  it("lets Organization Admin update the default organization and plant scope", async () => {
    const scopeStore = store();

    await updateOrganizationScope(
      { id: "org-admin", role: RoleName.ORGANIZATION_ADMIN, categoryId: null },
      {
        organizationName: " Organization ",
        organizationSlug: " Organization ",
        plantName: " Main Site ",
        plantCode: " Main ",
      },
      scopeStore,
    );

    expect(scopeStore.update).toHaveBeenCalledWith(
      {
        organizationName: "Organization",
        organizationSlug: "organization",
        plantName: "Main Site",
        plantCode: "main",
      },
      "org-admin",
    );
  });

  it("keeps organization scope updates limited to Admin even when Site Admin can manage plant profile", async () => {
    await expect(
      updateOrganizationScope(
        {
          id: "plant-admin",
          role: RoleName.SITE_ADMIN,
          categoryId: null,
          plantId: "plant-1",
          siteAdminPermissions: [
            { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_PLANT_PROFILE, enabled: true },
          ],
        },
        {
          organizationName: "Plant Org",
          organizationSlug: "plant-org",
          plantName: "Plant 01",
          plantCode: "plant-01",
        },
        store(),
      ),
    ).rejects.toThrow("Only admin can update the organization and plant scope");
  });

  it("lets permitted Site Admin update only the plant scope", async () => {
    const scopeStore = store();

    await updatePlantScope(
      {
        id: "plant-admin",
        role: RoleName.SITE_ADMIN,
        categoryId: null,
        plantId: "plant-1",
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_PLANT_PROFILE, enabled: true },
        ],
      },
      {
        plantName: "Plant 01",
        plantCode: "plant-01",
      },
      scopeStore,
    );

    expect(scopeStore.updatePlant).toHaveBeenCalledWith(
      {
        plantName: "Plant 01",
        plantCode: "plant-01",
      },
      "plant-admin",
      "plant-1",
    );
  });

  it("rejects Site Admin organization scope updates without a checkbox permission", async () => {
    await expect(
      updateOrganizationScope(
        { id: "plant-admin", role: RoleName.SITE_ADMIN, categoryId: null, plantId: "plant-1" },
        {
          organizationName: "Company",
          organizationSlug: "company",
          plantName: "Plant",
          plantCode: "plant",
        },
        store(),
      ),
    ).rejects.toThrow("Only admin can update the organization and plant scope");
  });

  it("rejects non-Admin updates", async () => {
    await expect(
      updateOrganizationScope(
        { id: "engineer", role: RoleName.ENGINEER, categoryId: "electrical" },
        {
          organizationName: "Company",
          organizationSlug: "company",
          plantName: "Plant",
          plantCode: "plant",
        },
        store(),
      ),
    ).rejects.toThrow("Only admin can update the organization and plant scope");
  });
});
