import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const local = readFileSync("prisma/migrations/20260908000100_asset_hierarchy_refactor/migration.sql", "utf8");
const production = readFileSync("prisma/supabase-migrations/20260908000100_asset_hierarchy_refactor.sql", "utf8");

describe("Asset hierarchy migration contract", () => {
  it("preserves Asset rows and enforces tenant-safe hierarchy references", () => {
    expect(local).toContain('INSERT INTO "new_Asset"');
    expect(local).toContain('SELECT "assetClassId"');
    expect(local).toContain('FOREIGN KEY ("systemId", "plantId")');
    expect(local).toContain('FOREIGN KEY ("parentId", "plantId")');
    expect(production).not.toContain('DROP TABLE "Asset"');
    expect(production).not.toContain('DELETE FROM "Asset"');
    expect(production).toContain('FOREIGN KEY ("systemId", "plantId")');
    expect(production).toContain('FOREIGN KEY ("parentId", "plantId")');
  });

  it("keeps the new production master server-only through RLS", () => {
    expect(production).toContain('ALTER TABLE "AssetSystem" ENABLE ROW LEVEL SECURITY');
    expect(production).toContain('ALTER TABLE "AssetCodeSequence" ENABLE ROW LEVEL SECURITY');
    expect(production).toContain('REVOKE ALL ON TABLE "AssetSystem", "AssetCodeSequence" FROM anon, authenticated');
    expect(production).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetSystem", "AssetCodeSequence" TO prisma');
    expect(production).toContain('CHECK ("assetLevel" IN (\'MAIN_ASSET\', \'SUB_ASSET\', \'PART\'))');
  });
});
