import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("repair request heading", () => {
  it("removes the duplicate Site identity hero and shows the resolved Site code beside the title", () => {
    const source = readFileSync("app/request/request-page-content.tsx", "utf8");

    expect(source).toContain("<span>แจ้งซ่อม</span>");
    expect(source).toContain("{plantScope.code}");
    expect(source).not.toContain("SiteIdentityHeader");
    expect(source).not.toContain('data-testid="repair-request-hero"');
    expect(source).not.toContain("readPlantProfile");
  });
});
