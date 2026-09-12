import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "prisma/supabase-migrations/20260912000100_replace_assets_with_r8.sql"), "utf8");

describe("R8 production migration contract", () => {
  it("is bound to the reviewed workbook and guarded by one transaction", () => {
    expect(sql).toContain("711ed08fba13865200e2b8c4c112c1f091d50f428e1f936cac670623d30f2978");
    expect(sql.trimStart().indexOf("BEGIN;")).toBeGreaterThan(0);
    expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
  });

  it("backs up Asset and work-history records before replacement", () => {
    for (const table of ["Asset", "AssetSystem", "AssetType", "AssetClass", "AssetFamily", "AssetTechnicalField", "AssetTechnicalValue", "AssetDocument", "CmWork", "PmWork", "PmGroupAsset", "Zone"]) {
      expect(sql).toContain(`asset_r8_backup_20260912."${table}"`);
    }
  });

  it("requires the approved CM and PM preflight state", () => {
    expect(sql).toContain("Linked CM count changed after approval");
    expect(sql).toContain("Linked CM Asset count changed after approval");
    expect(sql).toContain("Expected 28 CM works in the approved remap");
    expect(sql).toContain("PM Asset dependency appeared after approval");
    expect(sql).toContain("'AST-000293','MC-DPT-001','DPT2001'");
    expect(sql).toContain("'AST-CM-TRC-001','MC-EEQ-003','MA-ESP-001'");
  });

  it("renames the two reviewed Zones and verifies the R8 cardinalities", () => {
    expect(sql).toContain(`SET "name"='ASH Handling'`);
    expect(sql).toContain(`SET "name"='Water Treatment'`);
    expect(sql).toContain("R8 Asset count verification failed");
    expect(sql).toContain("R8 System count verification failed");
    expect(sql).toContain("R8 Asset Type count verification failed");
  });
});
