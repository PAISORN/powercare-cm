import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceFiles = [
  "components/app-nav-links.tsx",
  "app/admin/site-admin-permissions/page.tsx",
  "components/site-admin-permission-group-panel.tsx",
  "modules/auth/site-admin-permissions.ts",
  "prisma/schema.prisma",
  "prisma/schema.supabase.prisma",
];

describe("site admin naming", () => {
  it("uses Site Admin names for permissions, routes, components, and schema relations", () => {
    for (const file of sourceFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/PlantAdmin|plantAdmin|plant-admin|PLANT_ADMIN_CONFIGURABLE|PLANT_ADMIN_PERMISSION|MANAGE_PLANT_ADMIN/);
    }
  });

  it("routes Site Admin permission management through the Site Admin URL", () => {
    const navSource = readFileSync("components/app-nav-links.tsx", "utf8");
    expect(navSource).toContain("/admin/site-admin-permissions");
    expect(navSource).not.toContain("/admin/plant-admin-permissions");
  });
});
