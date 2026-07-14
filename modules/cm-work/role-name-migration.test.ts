import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RoleName } from "./cm-work-types";

describe("site admin role value", () => {
  it("uses SITE_ADMIN as the internal role value", () => {
    expect(RoleName.SITE_ADMIN).toBe("SITE_ADMIN");
    expect(Object.values(RoleName)).not.toContain("PLANT_ADMIN");
  });

  it("includes a migration that converts legacy PLANT_ADMIN users", () => {
    const migration = readFileSync("prisma/supabase-migrations/20260701_site_admin_role.sql", "utf8");
    expect(migration).toContain(`set role = 'SITE_ADMIN'`);
    expect(migration).toContain(`where role = 'PLANT_ADMIN'`);
  });
});
