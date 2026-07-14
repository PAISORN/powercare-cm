import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("query cache master data scope", () => {
  it("limits category caches to the default organization scope and legacy unscoped rows", () => {
    const source = readFileSync("lib/query-cache.ts", "utf8");
    expect(source).toContain("DEFAULT_ORGANIZATION_ID");
    expect(source).toContain("OR: [{ organizationId: DEFAULT_ORGANIZATION_ID }, { organizationId: null }]");
  });

  it("limits zone caches to the default plant scope and legacy unscoped rows", () => {
    const source = readFileSync("lib/query-cache.ts", "utf8");
    expect(source).toContain("DEFAULT_PLANT_ID");
    expect(source).toContain("OR: [{ plantId: DEFAULT_PLANT_ID }, { plantId: null }]");
    expect(source).toContain("getAllZonesForPlantCached");
    expect(source).toContain("export async function getAllZones(plantId = DEFAULT_PLANT_ID)");
  });
});
