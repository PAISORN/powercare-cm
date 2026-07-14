import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/admin/history/page.tsx", "utf8");

describe("Admin history page permissions", () => {
  it("scopes history records by audit log permission instead of always filtering admins to one plant", () => {
    expect(source).toContain("canViewPlantAuditLog(user)");
    expect(source).toContain("buildAuditEventScopeWhere(user)");
    expect(source).toContain("...auditScopeWhere");
    expect(source).not.toContain("const plantId = resolveUserPlantId(user)");
    expect(source).not.toContain("where: { action: { in: trackedActions }, plantId }");
  });
});
