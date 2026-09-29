import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store issue LINE event hooks", () => {
  it("dispatches LINE events from Store issue lifecycle actions", () => {
    const source = [
      "modules/store/store-issue-create-prisma.ts",
      "modules/store/store-issue-prisma.ts",
      "modules/store/store-issue-line-events.ts",
    ].map((path) => readFileSync(path, "utf8")).join("\n");

    expect(source).toContain("dispatchLineStoreEvent");
    expect(source).toContain("STORE_ISSUE_CREATED");
    expect(source).toContain("STORE_ISSUE_APPROVED");
    expect(source).toContain("STORE_ISSUE_REJECTED");
    expect(source).toContain("STORE_ISSUE_ISSUED");
    expect(source).toContain("STORE_NOT_ENOUGH_STOCK");
  });
});
