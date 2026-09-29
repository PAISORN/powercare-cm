import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store Prisma facade", () => {
  it("keeps the legacy interface as re-exports without implementation logic", () => {
    const source = readFileSync(
      "modules/store/store-prisma-service.ts",
      "utf8",
    );

    expect(source).toContain('from "./store-authorization"');
    expect(source).toContain('from "./store-classification-prisma"');
    expect(source).toContain('from "./inventory-item-prisma"');
    expect(source).toContain('from "./store-site-configuration-prisma"');
    expect(source).not.toContain("../../lib/db");
    expect(source).not.toContain("async function");
  });

  it("keeps Store workflow modules on the authorization seam", () => {
    for (const path of [
      "modules/store/store-adjustment-prisma.ts",
      "modules/store/store-excel-import-prisma.ts",
      "modules/store/store-issue-create-prisma.ts",
      "modules/store/store-issue-prisma.ts",
      "modules/store/store-receive-prisma.ts",
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('from "./store-authorization"');
      expect(source).not.toContain('from "./store-prisma-service"');
    }
  });
});
