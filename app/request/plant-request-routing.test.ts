import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plant-specific repair request routing", () => {
  it("keeps the general request page compatible while submitting plant code when provided", () => {
    const source = readFileSync("app/request/page.tsx", "utf8");
    expect(source).toContain("searchParams");
    expect(source).toContain('formData.get("plantCode")');
    expect(source).toContain('name="plantCode"');
    expect(source).toContain("plantName={plantScope.name}");
    expect(source).toContain("Site: {plantName}");
    expect(source).not.toContain("Plant: {plantName}");
    expect(source).toContain("getActiveZonesForScope(plantScope.id)");
    expect(source).toContain("createRepairRequest({ ...parsed, plantCode })");
  });

  it("adds a clean plant route for QR links", () => {
    expect(existsSync("app/p/[plantCode]/request/page.tsx")).toBe(true);
    const source = readFileSync("app/p/[plantCode]/request/page.tsx", "utf8");
    expect(source).toContain("RequestPageContent");
    expect(source).toContain("params");
    expect(source).toContain("plantCode");
  });
});
