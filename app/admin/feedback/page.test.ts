import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin feedback permission", () => {
  it("is reserved for platform feedback managers and excludes organization or site feedback", () => {
    const source = readFileSync("app/admin/feedback/page.tsx", "utf8");

    expect(source).toContain("canManageFeedback(user)");
    expect(source).toContain("organizationId: null, plantId: null");
    expect(source).toContain("include: { plant: true }");
    expect(source).not.toContain("readOrganizationScope");
    expect(source).not.toContain("canManageFeedback(user.role");
    expect(source).not.toContain("resolveUserPlantId");
    expect(source).not.toContain("where: { plantId }");
  });
});
