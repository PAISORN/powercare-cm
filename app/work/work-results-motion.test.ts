import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/work/page.tsx", "utf8");

describe("work results motion", () => {
  it("marks each work result row for scroll reveal so status badges and actions animate in", () => {
    expect(source).toContain("data-reveal-section");
    expect(source).toContain("Work Results");
  });
});
