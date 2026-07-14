import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("modules/line/line-settings-service.ts", "utf8");

describe("LINE settings service permissions", () => {
  it("checks full actor permissions instead of role-only access", () => {
    expect(source).toContain("canManageLineSettings(actor)");
    expect(source).toContain("canTestLineMessaging(actor)");
    expect(source).not.toContain("canManageLineSettings(actor.role)");
  });
});
