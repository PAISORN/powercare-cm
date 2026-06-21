import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin LINE group discovery wiring", () => {
  it("lists masked discoveries and pre-fills the existing destination form", () => {
    const source = readFileSync("app/admin/line/page.tsx", "utf8");

    expect(source).toContain("listLineGroupDiscoveries");
    expect(source).toContain('name="discoveryId"');
    expect(source).toContain("?discovery=");
    expect(source).toContain("maskLineTargetId(discovery.groupId)");
    expect(source).not.toContain("{discovery.groupId}</");
  });
});
