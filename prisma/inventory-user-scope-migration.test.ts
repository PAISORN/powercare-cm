import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("inventory user scope migrations", () => {
  const local = readFileSync("prisma/migrations/20260804000100_inventory_user_scopes/migration.sql", "utf8");
  const supabase = readFileSync("prisma/supabase-migrations/20260805000100_inventory_user_scopes.sql", "utf8");

  it.each([["local", local], ["supabase", supabase]])("adds the issue kind and user inventory scope in %s", (_name, sql) => {
    expect(sql).toContain('"SparePartIssue"');
    expect(sql).toContain('"itemKind"');
    expect(sql).toContain('"UserInventoryScope"');
    expect(sql).toContain('"responsibilityEnabled"');
    expect(sql).toContain('"approvalEnabled"');
    expect(sql).toContain("'SPARE_PART'");
    expect(sql).toContain("'CHEMICAL'");
    expect(sql).toContain("'OIL'");
  });

  it("protects the new Supabase table from browser roles", () => {
    expect(supabase).toContain('ALTER TABLE "UserInventoryScope" ENABLE ROW LEVEL SECURITY');
    expect(supabase).toContain('REVOKE ALL ON TABLE "UserInventoryScope" FROM anon, authenticated');
    expect(supabase).toContain('ON CONFLICT ("userId", "itemKind") DO NOTHING');
  });
});
