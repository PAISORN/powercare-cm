import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("inventory user scope migrations", () => {
  const local = readFileSync("prisma/migrations/20260804000100_inventory_user_scopes/migration.sql", "utf8");
  const supabase = readFileSync("prisma/supabase-migrations/20260805000100_inventory_user_scopes.sql", "utf8");
  const prismaPolicy = readFileSync("prisma/supabase-migrations/20260805015414_user_inventory_scope_prisma_policy.sql", "utf8");

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

  it("allows only the Prisma server role to manage inventory scopes", () => {
    expect(prismaPolicy).toContain('GRANT SELECT, INSERT, UPDATE, DELETE');
    expect(prismaPolicy).toContain('TO prisma');
    expect(prismaPolicy).toContain('CREATE POLICY "user_inventory_scope_prisma_server_access"');
    expect(prismaPolicy).toContain('FOR ALL');
    expect(prismaPolicy).toContain('USING (true)');
    expect(prismaPolicy).toContain('WITH CHECK (true)');
    expect(prismaPolicy).not.toContain('TO anon');
    expect(prismaPolicy).not.toContain('TO authenticated');
  });
});
