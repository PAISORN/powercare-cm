import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readModels(path: string) {
  const source = readFileSync(path, "utf8");
  const models = new Map<string, Map<string, string>>();

  for (const match of source.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, modelName, body] = match;
    const fields = new Map<string, string>();
    for (const line of body.split("\n")) {
      const field = line.match(/^\s{2}(\w+)\s+([^\s]+)/);
      if (field) fields.set(field[1], field[2]);
    }
    models.set(modelName, fields);
  }

  return models;
}

describe("Prisma schema parity", () => {
  it("keeps local SQLite and Supabase model fields aligned", () => {
    expect(readModels("prisma/schema.supabase.prisma")).toEqual(readModels("prisma/schema.prisma"));
  });

  it("migrates the LINE destination site scope used by daily reports", () => {
    const migration = readFileSync(
      "prisma/supabase-migrations/20260702_line_destination_plant_scope.sql",
      "utf8",
    );

    expect(migration).toContain('ALTER TABLE "LineDestination" ADD COLUMN IF NOT EXISTS "plantId" TEXT');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS "LineDestination_plantId_active_idx"');
  });

  it("keeps the production Asset migrations ordered and server-only", () => {
    const registry = readFileSync(
      "prisma/supabase-migrations/20260802000100_assets_registry.sql",
      "utf8",
    );
    const zoneBasedCodes = readFileSync(
      "prisma/supabase-migrations/20260802000200_asset_codes_without_system.sql",
      "utf8",
    );

    expect(registry).toContain('CREATE TABLE "Asset"');
    expect(zoneBasedCodes).toContain('DROP TABLE "AssetSystem"');
    expect(zoneBasedCodes).toContain('ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY');
    expect(zoneBasedCodes).toContain('REVOKE ALL ON TABLE "Asset" FROM anon, authenticated');
    expect(zoneBasedCodes).toContain('CREATE POLICY "asset_prisma_server_access"');
  });

  it("includes the production Inventory User Scope migration", () => {
    const migration = readFileSync(
      "prisma/supabase-migrations/20260805000100_inventory_user_scopes.sql",
      "utf8",
    );

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "UserInventoryScope"');
    expect(migration).toContain('ALTER TABLE "UserInventoryScope" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE "UserInventoryScope" FROM anon, authenticated');
  });
});
