import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public product landing", () => {
  it("redirects signed-in users and stores feedback at platform scope", () => {
    const source = readFileSync("app/page.tsx", "utf8");

    expect(source).toContain("submitPlatformFeedback");
    expect(source).toContain("PublicLanding");
    expect(source).toContain("db.publicFeedback.create");
    expect(source).toContain("organizationId: null");
    expect(source).toContain("plantId: null");
    expect(source).toContain("if (user) redirect(\"/dashboard\")");
  });
});
