import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Members date picker layout", () => {
  it("does not clip the Admin and Engineer calendar popup", () => {
    const source = readFileSync("app/members/page.tsx", "utf8");

    expect(source).not.toContain('<section className="overflow-hidden rounded-3xl');
    expect(source).toContain("rounded-t-3xl");
    expect(source).toContain("canSeeMetrics ? (");
  });
});
