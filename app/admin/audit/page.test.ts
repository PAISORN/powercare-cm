import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/admin/audit/page.tsx", "utf8");

describe("Admin audit page permissions", () => {
  it("uses audit log permission instead of organization settings permission", () => {
    expect(source).toContain("canViewPlantAuditLog(user)");
    expect(source).not.toContain("canManageOrganization");
    expect(source).not.toContain("user.role as RoleName");
  });

  it("scopes audit events by role, allowing admins to see all plants and Site Admins to see their own plant", () => {
    expect(source).toContain("buildAuditEventScopeWhere(user)");
    expect(source).toContain("...auditScopeWhere");
  });
});
