import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Site Admin permission schema", () => {
  it("adds the SiteAdminPermission model to local and Supabase Prisma schemas", () => {
    for (const schemaPath of ["prisma/schema.prisma", "prisma/schema.supabase.prisma"]) {
      const schema = readFileSync(schemaPath, "utf8");

      expect(schema).toContain("model SiteAdminPermission");
      expect(schema).toContain("@@unique([userId, plantId, permissionKey])");
      expect(schema).toContain("@@index([plantId, permissionKey, enabled])");
      expect(schema).toContain('SiteAdminPermissions SiteAdminPermission[]');
    }
  });

  it("keeps the Supabase migration closed to Data API access until policies are designed", () => {
    const migration = readFileSync("prisma/supabase-migrations/20260630_plant_admin_permissions.sql", "utf8");

    expect(migration).toContain('create table if not exists public."SiteAdminPermission"');
    expect(migration).toContain('alter table public."SiteAdminPermission" enable row level security');
    expect(migration).toContain("Keep direct Data API access closed");
  });
});
