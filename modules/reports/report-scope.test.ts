import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { buildReportScope } from "./report-scope";

describe("report export plant scope", () => {
  it("lets owner admins export all organizations", () => {
    expect(buildReportScope({ id: "admin", role: RoleName.ADMIN, organizationId: null, plantId: "plant-a" })).toEqual({});
  });

  it("keeps organization admins scoped to their own organization", () => {
    expect(buildReportScope({ id: "org-admin", role: RoleName.ORGANIZATION_ADMIN, organizationId: "org-a", plantId: null })).toEqual({
      organizationId: "org-a",
    });
  });

  it("keeps plant roles scoped to their plant", () => {
    expect(buildReportScope({ id: "plant-admin", role: RoleName.SITE_ADMIN, organizationId: "org-a", plantId: "plant-a" })).toEqual({
      plantId: "plant-a",
    });
    expect(buildReportScope({ id: "engineer", role: RoleName.ENGINEER, organizationId: "org-b", plantId: "plant-b" })).toEqual({
      plantId: "plant-b",
    });
  });
});
