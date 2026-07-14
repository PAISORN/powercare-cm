import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { DEFAULT_PLANT_ID } from "./organization-foundation";
import { buildUserOperationalScope, resolveUserOperationalPlantId, resolveUserPlantId } from "./user-plant-scope";

describe("user plant scope", () => {
  it("uses the user's assigned plant when available", () => {
    expect(resolveUserPlantId({ plantId: "plant-a" })).toBe("plant-a");
  });

  it("falls back to the default plant for older users without a plant", () => {
    expect(resolveUserPlantId({ plantId: null })).toBe(DEFAULT_PLANT_ID);
    expect(resolveUserPlantId({})).toBe(DEFAULT_PLANT_ID);
  });

  it("does not restrict owner admins to one plant in legacy operational plant views", () => {
    expect(resolveUserOperationalPlantId({ role: RoleName.ADMIN, plantId: "plant-a" })).toBeUndefined();
    expect(resolveUserOperationalPlantId({ role: RoleName.ORGANIZATION_ADMIN, plantId: "plant-a" })).toBeUndefined();
  });

  it("keeps plant roles scoped to their assigned plant in operational views", () => {
    expect(resolveUserOperationalPlantId({ role: RoleName.SITE_ADMIN, plantId: "plant-a" })).toBe("plant-a");
    expect(resolveUserOperationalPlantId({ role: RoleName.ENGINEER, plantId: "plant-b" })).toBe("plant-b");
    expect(resolveUserOperationalPlantId({ role: RoleName.TECHNICIAN, plantId: null })).toBe(DEFAULT_PLANT_ID);
  });

  it("builds organization-aware operational scopes for multi-site views", () => {
    expect(buildUserOperationalScope({ role: RoleName.ADMIN, organizationId: null, plantId: "plant-a" })).toEqual({});
    expect(buildUserOperationalScope({ role: RoleName.ORGANIZATION_ADMIN, organizationId: "org-a", plantId: null })).toEqual({
      organizationId: "org-a",
    });
    expect(buildUserOperationalScope({ role: RoleName.SITE_ADMIN, organizationId: "org-a", plantId: "plant-a" })).toEqual({
      plantId: "plant-a",
    });
  });
});
