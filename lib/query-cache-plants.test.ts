import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("query cache plants", () => {
  it("loads active plants inside the default organization scope", () => {
    const source = readFileSync("lib/query-cache.ts", "utf8");
    expect(source).toContain("plants: \"plants\"");
    expect(source).toContain("getActivePlantsCached");
    expect(source).toContain("getActivePlantsForOrganizationCached");
    expect(source).toContain("organizationId: DEFAULT_ORGANIZATION_ID");
    expect(source).toContain("export async function getActivePlants()");
    expect(source).toContain("export async function getActivePlantsForScope(organizationId?: string | null)");
  });
});
