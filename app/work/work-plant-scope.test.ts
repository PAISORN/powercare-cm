import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work list plant scope", () => {
  const source = [
    "app/work/page.tsx",
    "app/work/actions.ts",
    "modules/cm-work/work-list-page-data.ts",
    "modules/cm-work/work-list-query.ts",
    "components/work-list-page/work-results.tsx",
  ].map((file) => readFileSync(file, "utf8")).join("\n");

  it("filters work results and zone choices by the signed-in user's operational scope", () => {
    expect(source).toContain("buildUserOperationalScope");
    expect(source).toContain("const scope = buildUserOperationalScope(user)");
    expect(source).toContain("buildWorkWhere(filters, dateFilter, scope)");
    expect(source).toContain("getActiveZonesForReportScope(scope)");
    expect(source).toContain("if (scope?.organizationId) where.organizationId = scope.organizationId");
    expect(source).toContain("if (scope?.plantId) where.plantId = scope.plantId");
  });

  it("keeps work result action labels readable", () => {
    expect(source).toContain("รับงาน");
    expect(source).not.toContain("�");
    expect(source).not.toContain("�");
  });
});
