import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("store reissue migration", () => {
  it("allows the same spare part reference code to be requested again after cancel", () => {
    const migration = readFileSync(
      "prisma/supabase-migrations/20260720_allow_reissue_after_cancel.sql",
      "utf8",
    );

    expect(migration).toContain('DROP INDEX IF EXISTS "SparePartIssueItem_lineNumber_key"');
  });
});
