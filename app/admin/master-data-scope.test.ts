import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin master data scope", () => {
  it("creates and lists categories inside the active site scope", () => {
    const source = readFileSync("app/admin/categories/page.tsx", "utf8");
    expect(source).toContain("resolveAdminSiteScope");
    expect(source).toContain("organizationId: scope.organization.id");
    expect(source).toContain("plantId: scope.plant.id");
    expect(source).toContain("OR: [{ plantId: scope.plant.id }, { plantId: null }]");
    expect(source).toContain("where: { id, plantId: scope.plant.id }");
    expect(source).toContain("const shared = category.plantId === null");
  });

  it("creates and lists zones inside the active plant scope", () => {
    const source = readFileSync("app/admin/zones/page.tsx", "utf8");
    expect(source).toContain("resolveAdminSiteScope");
    expect(source).toContain("plantId: scope.plant.id");
    expect(source).toContain("OR: [{ plantId: scope.plant.id }, { plantId: null }]");
    expect(source).toContain("where: { id, plantId: scope.plant.id }");
    expect(source).toContain("const shared = zone.plantId === null");
  });

  it("allows the same category and zone names in different plant scopes", () => {
    const sqliteSchema = readFileSync("prisma/schema.prisma", "utf8");
    const supabaseSchema = readFileSync("prisma/schema.supabase.prisma", "utf8");

    for (const source of [sqliteSchema, supabaseSchema]) {
      expect(source).not.toContain("name      String   @unique");
      expect(source).toContain("@@unique([plantId, name])");
    }
  });
});
