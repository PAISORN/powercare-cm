import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/admin/history/page.tsx", "utf8");
const statusSource = readFileSync("app/admin/status/page.tsx", "utf8");

describe("Admin history page permissions", () => {
  it("scopes history records by audit log permission instead of always filtering admins to one plant", () => {
    expect(source).toContain("canViewPlantAuditLog(user)");
    expect(source).toContain("buildAuditEventScopeWhere(user)");
    expect(source).toContain("...auditScopeWhere");
    expect(source).not.toContain("const plantId = resolveUserPlantId(user)");
    expect(source).not.toContain("where: { action: { in: trackedActions }, plantId }");
  });

  it("lets the admin summary grids shrink to the mobile content width", () => {
    expect(source).toContain("grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-72");
    expect(statusSource).toContain("grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-64");
  });
});
