import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work list plant scope", () => {
  it("filters work results and zone choices by the signed-in user's operational scope", () => {
    const source = readFileSync("app/work/page.tsx", "utf8");

    expect(source).toContain("buildUserOperationalScope");
    expect(source).toContain("const scope = buildUserOperationalScope(user)");
    expect(source).toContain("buildWorkWhere(filters, dateFilter, scope)");
    expect(source).toContain("getActiveZonesForReportScope(scope)");
    expect(source).toContain("if (scope?.organizationId) where.organizationId = scope.organizationId");
    expect(source).toContain("if (scope?.plantId) where.plantId = scope.plantId");
  });

  it("keeps work result action labels readable", () => {
    const source = readFileSync("app/work/page.tsx", "utf8");

    expect(source).toContain("รับงาน");
    expect(source).not.toContain("à¸");
    expect(source).not.toContain("Â");
  });
});
