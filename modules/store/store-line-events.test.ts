import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store issue LINE event hooks", () => {
  it("dispatches LINE events from Store issue lifecycle actions", () => {
    const source = readFileSync("modules/store/store-issue-prisma.ts", "utf8");

    expect(source).toContain("dispatchLineStoreEvent");
    expect(source).toContain("STORE_ISSUE_CREATED");
    expect(source).toContain("STORE_ISSUE_APPROVED");
    expect(source).toContain("STORE_ISSUE_REJECTED");
    expect(source).toContain("STORE_ISSUE_ISSUED");
    expect(source).toContain("STORE_NOT_ENOUGH_STOCK");
  });
});
