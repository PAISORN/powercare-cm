import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory issue page", () => {
  it("renders the latest issue list as compact two-line rows", () => {
    const source = readFileSync("app/inventory/issue/page.tsx", "utf8");

    expect(source).toContain("CompactIssueRow");
    expect(source).toContain("issue-row-two-line");
    expect(source).toContain("truncate");
    expect(source).toContain("details");
  });
});
