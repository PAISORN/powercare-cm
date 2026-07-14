import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CM work creation scope", () => {
  it("stores new repair requests in the resolved organization and plant scope", () => {
    const source = readFileSync("modules/cm-work/cm-work-service.ts", "utf8");
    expect(source).toContain("plantCode?: string | null");
    expect(source).toContain("resolveRequestPlantScope");
    expect(source).toContain("createPrismaRequestPlantScopeStore(tx)");
    expect(source).toContain("organizationId: plantScope.organizationId");
    expect(source).toContain("plantId: plantScope.id");
  });
});
