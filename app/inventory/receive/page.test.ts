import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory receive page", () => {
  it("renders recent receives as compact two-line rows", () => {
    const source = readFileSync("app/inventory/receive/page.tsx", "utf8");

    expect(source).toContain("CompactReceiveRow");
    expect(source).toContain("receive-row-two-line");
    expect(source).toContain("truncate");
  });
});
