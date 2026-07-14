import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("member query plant scope", () => {
  it("filters members and workload metrics by operational scope", () => {
    const source = readFileSync("modules/members/member-query.ts", "utf8");

    expect(source).toContain("scope?: OperationalScope");
    expect(source).toContain("...buildMemberUserWhere(scope)");
    expect(source).toContain("...buildMemberViewerRoleWhere(viewerRole)");
    expect(source).toContain("const workScopeWhere: Prisma.CmWorkWhereInput = buildMemberWorkWhere(scope)");
    expect(source).toContain("organizationId: scope.organizationId");
    expect(source).toContain("plantId: scope.plantId");
  });
});
