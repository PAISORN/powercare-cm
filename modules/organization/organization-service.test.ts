import { describe, expect, it, vi } from "vitest";
import { PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import { readOrganizationProfile, updateOrganizationProfile, type OrganizationProfileStore } from "./organization-service";

function store(): OrganizationProfileStore {
  return {
    read: vi.fn(async () => null),
    readOrganizationName: vi.fn(async (organizationId) => (organizationId === "org-a" ? "Organization A" : null)),
    update: vi.fn(async (input, _actorId, organizationId) => ({ id: organizationId ?? "primary", organizationId, ...input })),
  };
}

describe("organization service", () => {
  it("uses the PowerCare fallback before an organization is configured", async () => {
    expect((await readOrganizationProfile(undefined, store())).companyName).toBe("Power Care.CM");
  });

  it("uses the organization name when an organization profile is not configured yet", async () => {
    expect((await readOrganizationProfile("org-a", store())).companyName).toBe("Organization A");
  });

  it("lets Admin update the organization profile", async () => {
    const profileStore = store();
    await updateOrganizationProfile(
      { id: "admin", role: RoleName.ADMIN, categoryId: null },
      { companyName: " Company ", logoFileName: null, logoMimeType: null, logoFileSize: null, logoStoragePath: null },
      profileStore,
    );
    expect(profileStore.update).toHaveBeenCalledWith(expect.objectContaining({ companyName: "Company" }), "admin", undefined);
  });

  it("lets Organization Admin update the organization profile", async () => {
    const profileStore = store();
    await updateOrganizationProfile(
      { id: "org-admin", role: RoleName.ORGANIZATION_ADMIN, categoryId: null, organizationId: "org-a" },
      { companyName: " Organization ", logoFileName: null, logoMimeType: null, logoFileSize: null, logoStoragePath: null },
      profileStore,
    );
    expect(profileStore.update).toHaveBeenCalledWith(expect.objectContaining({ companyName: "Organization" }), "org-admin", "org-a");
  });

  it("keeps company profile updates limited to Admin even when Site Admin can manage plant profile", async () => {
    await expect(
      updateOrganizationProfile(
        {
          id: "plant-admin",
          role: RoleName.SITE_ADMIN,
          categoryId: null,
          plantId: "plant-1",
          siteAdminPermissions: [
            { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_PLANT_PROFILE, enabled: true },
          ],
        },
        { companyName: " Plant Company ", logoFileName: null, logoMimeType: null, logoFileSize: null, logoStoragePath: null },
        store(),
      ),
    ).rejects.toThrow("Only admin can update the organization profile");
  });

  it("rejects Site Admin organization updates without a checkbox permission", async () => {
    await expect(
      updateOrganizationProfile(
        { id: "plant-admin", role: RoleName.SITE_ADMIN, categoryId: null, plantId: "plant-1" },
        { companyName: "Company", logoFileName: null, logoMimeType: null, logoFileSize: null, logoStoragePath: null },
        store(),
      ),
    ).rejects.toThrow("Only admin can update the organization profile");
  });

  it("rejects non-Admin updates", async () => {
    await expect(
      updateOrganizationProfile(
        { id: "engineer", role: RoleName.ENGINEER, categoryId: "electrical" },
        { companyName: "Company", logoFileName: null, logoMimeType: null, logoFileSize: null, logoStoragePath: null },
        store(),
      ),
    ).rejects.toThrow("Only admin can update the organization profile");
  });
});
