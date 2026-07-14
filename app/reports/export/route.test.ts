import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("report export scope", () => {
  it("uses report export scope so admins can export all plants while plant roles stay scoped", () => {
    const source = readFileSync("app/reports/export/route.ts", "utf8");

    expect(source).toContain("buildReportScope(user)");
    expect(source).not.toContain("resolveUserPlantId(user)");
    expect(source).toContain("queryReportRows(filter, scope)");
  });
});
