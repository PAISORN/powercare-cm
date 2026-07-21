import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("platform announcement scope", () => {
  it("creates, lists, updates, and deletes only platform announcements", () => {
    const source = readFileSync("modules/announcements/announcement-service.ts", "utf8");

    expect(source).toContain("organizationId: null");
    expect(source).toContain("listPublicAnnouncements(now = new Date())");
    expect(source).toContain("where: { id, organizationId: null }");
    expect(source).not.toContain("organizationId: actor.organizationId");
  });
});
