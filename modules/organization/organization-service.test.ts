import { describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { readOrganizationProfile, updateOrganizationProfile, type OrganizationProfileStore } from "./organization-service";

function store(): OrganizationProfileStore {
  return {
    read: vi.fn(async () => null),
    update: vi.fn(async (input) => ({ id: "primary", ...input })),
  };
}

describe("organization service", () => {
  it("uses the PowerCare fallback before an organization is configured", async () => {
    expect((await readOrganizationProfile(store())).companyName).toBe("PowerCare.CM");
  });

  it("lets Admin update the organization profile", async () => {
    const profileStore = store();
    await updateOrganizationProfile(
      { id: "admin", role: RoleName.ADMIN, categoryId: null },
      { companyName: " Company ", logoFileName: null, logoMimeType: null, logoFileSize: null, logoStoragePath: null },
      profileStore,
    );
    expect(profileStore.update).toHaveBeenCalledWith(expect.objectContaining({ companyName: "Company" }), "admin");
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
