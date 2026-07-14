import { describe, expect, it } from "vitest";
import { LEGACY_SITE_ADMIN_ROLE, RoleName } from "../cm-work/cm-work-types";
import { formatRoleName } from "./role-labels";

describe("role labels", () => {
  it("shows the Site Admin role as Site Admin", () => {
    expect(formatRoleName(RoleName.SITE_ADMIN)).toBe("Site Admin");
  });

  it("keeps legacy Site Admin data readable while migration is pending", () => {
    expect(formatRoleName(LEGACY_SITE_ADMIN_ROLE)).toBe("Site Admin");
  });

  it("keeps other role names readable", () => {
    expect(formatRoleName(RoleName.ADMIN)).toBe("Owner Admin");
    expect(formatRoleName(RoleName.ORGANIZATION_ADMIN)).toBe("Organization Admin");
    expect(formatRoleName(RoleName.ENGINEER)).toBe("Engineer");
    expect(formatRoleName(RoleName.TECHNICIAN)).toBe("Technician");
    expect(formatRoleName(RoleName.VISITOR)).toBe("Visitor");
  });
});
