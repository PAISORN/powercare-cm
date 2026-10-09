import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "prisma/supabase-migrations/20261006000200_sync_local_technical_field_templates.sql",
  ),
  "utf8",
);

describe("Technical Field Template production sync contract", () => {
  it("is bound to the reviewed Local snapshot and one transaction", () => {
    expect(sql).toContain("Source rows: 116; Asset Types: 21");
    expect(sql).toContain("Excluded Local-only legacy Instrument sub-types");
    expect(sql.trimStart().indexOf("BEGIN;")).toBeGreaterThan(0);
    expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
  });

  it("checks the exact Production tenant and every Asset Type mapping", () => {
    expect(sql).toContain("'primary-plant' AND lower(\"code\")='rtb'");
    expect(sql).toContain("Production Asset Types are missing for Local templates");
    expect(sql).toContain("Technical Field source count must be 116");
  });

  it("backs up fields and values before applying the merge", () => {
    expect(sql).toContain(
      'technical_field_sync_backup_20261006."AssetTechnicalField"',
    );
    expect(sql).toContain(
      'technical_field_sync_backup_20261006."AssetTechnicalValue"',
    );
    expect(sql).toContain("An existing Production Technical Field ID was removed");
    expect(sql).toContain("Technical Values changed during template sync");
  });

  it("upserts all template attributes without deleting Production-only rows", () => {
    expect(sql).toContain('ON CONFLICT ("assetTypeId", "key") DO UPDATE SET');
    for (const column of [
      "labelTh",
      "labelEn",
      "dataType",
      "unit",
      "helpText",
      "indicatorText",
      "optionsJson",
      "required",
      "active",
      "sortOrder",
    ]) {
      expect(sql).toContain(`\"${column}\"=EXCLUDED.\"${column}\"`);
    }
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"AssetTechnicalField"/i);
  });
});
