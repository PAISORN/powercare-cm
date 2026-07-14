import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard query plant scope", () => {
  it("adds organization or plant scope to dashboard summary, trend, and priority query filters", () => {
    const source = readFileSync("modules/dashboard/dashboard-query.ts", "utf8");

    expect(source).toContain("scope?: OperationalScope");
    expect(source).toContain("const scopeWhere: Prisma.CmWorkWhereInput = buildOperationalCmWorkWhere(filter?.scope)");
    expect(source).toContain("const summaryWhere: Prisma.CmWorkWhereInput = { ...scopeWhere");
    expect(source).toContain("const trendWhere: Prisma.CmWorkWhereInput = { ...scopeWhere");
    expect(source).toContain("const priorityBaseWhere: Prisma.CmWorkWhereInput = {");
    expect(source).toContain("...scopeWhere");
    expect(source).toContain("getDashboardCategoriesOrganizationId(filter?.scope)");
    expect(source).toContain("getAllCategoriesForPlantScope(filter?.scope?.plantId, categoryOrganizationId)");
    expect(source).toContain("getAllZonesForDashboardScope(filter?.scope)");
  });
});
