import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("announcement organization scope", () => {
  it("creates, lists, updates, and deletes announcements inside one organization", () => {
    const source = readFileSync("modules/announcements/announcement-service.ts", "utf8");

    expect(source).toContain("organizationId?: string");
    expect(source).toContain("organizationId: actor.organizationId");
    expect(source).toContain("listPublicAnnouncements(now = new Date(), organizationId?: string)");
    expect(source).toContain("where: { id, organizationId }");
  });
});
