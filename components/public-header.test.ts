import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PublicHeader", () => {
  it("keeps the public top bar compact by removing the Track Work link", () => {
    const source = readFileSync("components/public-header.tsx", "utf8");

    expect(source).not.toContain("Track Work");
    expect(source).not.toContain('href="/tracking"');
    expect(source).toContain('aria-label="Staff Login"');
  });
});
