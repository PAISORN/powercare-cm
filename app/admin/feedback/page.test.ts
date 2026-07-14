import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin feedback permission", () => {
  it("is reserved for all-plant feedback managers and does not force a single plant scope", () => {
    const source = readFileSync("app/admin/feedback/page.tsx", "utf8");

    expect(source).toContain("canManageFeedback(user)");
    expect(source).toContain("readOrganizationScope");
    expect(source).toContain("organizationId: scope.organization.id");
    expect(source).toContain("include: { plant: true }");
    expect(source).not.toContain("canManageFeedback(user.role");
    expect(source).not.toContain("resolveUserPlantId");
    expect(source).not.toContain("where: { plantId }");
  });
});
