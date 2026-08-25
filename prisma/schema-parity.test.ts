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

function normalizeSql(source: string) {
  return source
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .replace(/\)(REFERENCES|ON|WHERE)/g, ") $1");
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

  it("keeps PM partial constraints equivalent and production tables server-only", () => {
    const local = readFileSync(
      "prisma/migrations/20260815000100_pm_planning/migration.sql",
      "utf8",
    );
    const production = readFileSync(
      "prisma/supabase-migrations/20260815000100_pm_planning.sql",
      "utf8",
    );
    const normalizedLocal = normalizeSql(local);
    const normalizedProduction = normalizeSql(production);
    const currentPlanConstraint =
      'CREATE UNIQUE INDEX "PmPlan_current_plant_date_key" ON "PmPlan"("plantId", "plannedDateKey") WHERE "status" <> \'CANCELED\'';
    const leadConstraint =
      'CREATE UNIQUE INDEX "PmWorkAssignee_one_lead_key" ON "PmWorkAssignee"("pmWorkId") WHERE "role" = \'LEAD\'';

    expect(local).toContain(currentPlanConstraint);
    expect(production).toContain(currentPlanConstraint);
    expect(local).toContain(leadConstraint);
    expect(production).toContain(leadConstraint);
    for (const constraint of [
      "PmPlan_status_check",
      "PmWork_status_check",
      "PmWork_result_check",
      "PmWorkAssignee_role_check",
      "PmPlan_plannedDateKey_check",
      "PmPlanSequence_creationDateKey_check",
      "PmWorkSourceGroup_pmWork_fkey",
      "PmWorkSourceGroup_snapshot_fkey",
      "PmGroup_plant_organization_fkey",
      "PmPlan_plant_organization_fkey",
      "PmGroupAsset_group_site_fkey",
      "PmGroupAsset_asset_site_fkey",
      "PmPlanDraftGroup_plan_site_fkey",
      "PmPlanDraftGroup_group_site_fkey",
      "PmPlanGroupSnapshot_plan_site_fkey",
      "PmPlanGroupSnapshot_group_site_fkey",
      "PmWork_plan_site_fkey",
      "PmWork_asset_site_fkey",
    ]) {
      expect(local).toContain(constraint);
      expect(production).toContain(constraint);
    }
    expect(local).toContain('CREATE TABLE "PmPlanDraftGroup"');
    expect(production).toContain('CREATE TABLE "PmPlanDraftGroup"');
    expect(local).toContain('"siteCodeSegment", "creationDateKey"');
    expect(production).toContain('"siteCodeSegment", "creationDateKey"');
    expect(production).toContain('ALTER TABLE "PmWork" ENABLE ROW LEVEL SECURITY');
    expect(production).toContain('ALTER TABLE "PmPlanDraftGroup" ENABLE ROW LEVEL SECURITY');
    expect(production).toContain('REVOKE ALL ON TABLE "PmGroup"');
    expect(production).toContain('TO prisma');
    expect(production).not.toMatch(/GRANT[^;]+TO (anon|authenticated)/s);

    for (const index of [
      '"Plant_id_organizationId_key" ON "Plant"("id", "organizationId")',
      '"Asset_id_plantId_key" ON "Asset"("id", "plantId")',
      '"PmGroup_id_plantId_key" ON "PmGroup"("id", "plantId")',
      '"PmPlan_id_plantId_key" ON "PmPlan"("id", "plantId")',
    ]) {
      expect(local).toContain(index);
      expect(production).toContain(index);
    }
    for (const foreignKey of [
      'CONSTRAINT "PmGroup_plant_organization_fkey" FOREIGN KEY("plantId","organizationId") REFERENCES "Plant"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE',
      'CONSTRAINT "PmPlan_plant_organization_fkey" FOREIGN KEY("plantId","organizationId") REFERENCES "Plant"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE',
      'CONSTRAINT "PmGroupAsset_group_site_fkey" FOREIGN KEY("pmGroupId","plantId") REFERENCES "PmGroup"("id","plantId") ON DELETE CASCADE ON UPDATE CASCADE',
      'CONSTRAINT "PmGroupAsset_asset_site_fkey" FOREIGN KEY("assetId","plantId") REFERENCES "Asset"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE',
      'CONSTRAINT "PmPlanDraftGroup_plan_site_fkey" FOREIGN KEY("pmPlanId","plantId") REFERENCES "PmPlan"("id","plantId") ON DELETE CASCADE ON UPDATE CASCADE',
      'CONSTRAINT "PmPlanDraftGroup_group_site_fkey" FOREIGN KEY("pmGroupId","plantId") REFERENCES "PmGroup"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE',
      'CONSTRAINT "PmPlanGroupSnapshot_plan_site_fkey" FOREIGN KEY("pmPlanId","plantId") REFERENCES "PmPlan"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE',
      'CONSTRAINT "PmPlanGroupSnapshot_group_site_fkey" FOREIGN KEY("sourcePmGroupId","plantId") REFERENCES "PmGroup"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE',
      'CONSTRAINT "PmWork_plan_site_fkey" FOREIGN KEY("pmPlanId","plantId") REFERENCES "PmPlan"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE',
      'CONSTRAINT "PmWork_asset_site_fkey" FOREIGN KEY("assetId","plantId") REFERENCES "Asset"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE',
    ]) {
      expect(normalizedLocal).toContain(foreignKey);
      expect(normalizedProduction).toContain(foreignKey);
    }
  });

  it("adds and backfills the atomic per-plan work sequence in both providers", () => {
    const local = readFileSync("prisma/migrations/20260815000200_pm_plan_work_sequence/migration.sql", "utf8");
    const production = readFileSync("prisma/supabase-migrations/20260815000200_pm_plan_work_sequence.sql", "utf8");
    for (const sql of [local, production]) {
      expect(sql).toContain('ALTER TABLE "PmPlan" ADD COLUMN "lastWorkSequence" INTEGER NOT NULL DEFAULT 0');
      expect(sql).toContain('UPDATE "PmPlan"');
      expect(sql).toContain('"pmPlanId"');
    }
  });

  it("adds the same persistent PM notification idempotency key in both providers", () => {
    const local = readFileSync("prisma/migrations/20260815000300_pm_notification_idempotency/migration.sql", "utf8");
    const production = readFileSync("prisma/supabase-migrations/20260815000300_pm_notification_idempotency.sql", "utf8");
    for (const sql of [local, production]) {
      expect(sql).toContain('"UserNotification"');
      expect(sql).toContain('"dispatchKey"');
      expect(sql).toContain('"UserNotification_dispatchKey_key"');
      expect(sql).toContain(`SET "sendTime" = '08:00'`);
    }
  });
});
