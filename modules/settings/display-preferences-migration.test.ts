import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("account settings schema compatibility", () => {
  it("declares the nullable field for both database providers with additive migrations", () => {
    for (const schema of ["prisma/schema.prisma", "prisma/schema.supabase.prisma"]) {
      expect(readFileSync(schema, "utf8")).toMatch(/displayPreferences\s+String\?/);
    }
    for (const migration of ["prisma/migrations/20261017095000_user_display_preferences/migration.sql", "prisma/supabase-migrations/20261017095000_user_display_preferences.sql"]) {
      const sql = readFileSync(migration, "utf8");
      expect(sql).toContain('ALTER TABLE "User" ADD COLUMN "displayPreferences" TEXT');
      expect(sql).not.toMatch(/\b(?:DELETE|TRUNCATE|DROP|UPDATE|INSERT)\b/i);
    }
  });
});
