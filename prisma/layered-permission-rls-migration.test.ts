import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("layered permission RLS migration", () => {
  const sql = readFileSync(
    "prisma/supabase-migrations/20260805110712_layered_permission_prisma_policies.sql",
    "utf8",
  );

  it.each(["RolePermissionOverride", "UserPermissionOverride"])(
    "allows the Prisma server role to manage %s",
    (tableName) => {
      expect(sql).toContain(`ON \"${tableName}\"`);
    },
  );

  it("keeps the policies scoped to the server database role", () => {
    expect(sql).toContain("TO prisma");
    expect(sql).toContain("FOR ALL");
    expect(sql).toContain("USING (true)");
    expect(sql).toContain("WITH CHECK (true)");
    expect(sql).not.toContain("TO anon");
    expect(sql).not.toContain("TO authenticated");
  });
});
