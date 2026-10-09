import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const migration = readFileSync(
  "prisma/supabase-migrations/20261009143217_asset_file_storage_bucket.sql",
  "utf8",
);

describe("Asset file storage provisioning", () => {
  test("creates a private 20 MB bucket for supported Asset files", () => {
    expect(migration).toContain("'powercare-asset-files'");
    expect(migration).toContain("false");
    expect(migration).toContain("20971520");
    for (const mimeType of ["image/png", "image/jpeg", "image/webp", "application/pdf"]) {
      expect(migration).toContain(`'${mimeType}'`);
    }
    expect(migration).toContain("ON CONFLICT (id) DO UPDATE SET");
  });

  test("documents the production bucket environment variable", () => {
    const deployGuide = readFileSync("docs/Vercel-Deploy.md", "utf8");
    expect(deployGuide).toContain("SUPABASE_ASSET_FILES_BUCKET=powercare-asset-files");
  });

  test("includes Asset files in the Supabase backup set", () => {
    const backupScript = readFileSync("scripts/backup-supabase.ps1", "utf8");
    expect(backupScript).toContain('SUPABASE_ASSET_FILES_BUCKET');
    expect(backupScript).toContain('$profileBucket,$signatureBucket,$assetFilesBucket');
    expect(backupScript).toContain('[ValidateSet("DIRECT_URL", "DATABASE_URL")]');
    expect(backupScript).toContain('$DatabaseUrlVariable = "DIRECT_URL"');
    expect(backupScript).toContain('"--no-password"');
  });
});
