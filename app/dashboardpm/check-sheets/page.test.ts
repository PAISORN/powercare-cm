import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/dashboardpm/check-sheets/page.tsx", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const planService = readFileSync("modules/pm/pm-plan-service.ts", "utf8");
const annualService = readFileSync("modules/pm/pm-annual-phase2-service.ts", "utf8");
const workService = readFileSync("modules/pm/pm-work-service.ts", "utf8");
const backfill = readFileSync("scripts/backfill-pm-check-sheet-snapshots.ts", "utf8");
const masterData = readFileSync("app/assets/master-data/page.tsx", "utf8");
const supabaseMigration = readFileSync("prisma/supabase-migrations/20261009174637_pm_check_sheet.sql", "utf8");

describe("PM Check Sheet setup", () => {
  it("uses MANAGE_PM_PLANS and an Asset hierarchy selector", () => {
    expect(source).toContain("if (!canManagePmPlans(user))");
    expect(source).toContain("buildAssetHierarchy");
    expect(source).toContain("<PmCheckSheetTree");
    expect(source).toContain('currentPage="check-sheets"');
  });

  it("keeps Default items read-only and manages only Asset-scoped Custom items", () => {
    expect(source).toContain('source="Default" locked');
    expect(source).toContain("createPmCheckSheetItem");
    expect(source).toContain("updatePmCheckSheetItem");
    expect(source).toContain("retirePmCheckSheetItem");
    expect(source).toContain("Add Checklist");
    expect(source).toContain("PM Work จะเก็บ Snapshot เมื่อถูกสร้าง");
  });

  it("persists custom definitions separately and snapshots every PM Work creation path", () => {
    expect(schema).toContain("model PmCheckSheetItem");
    expect(schema).toContain("checkSheetSnapshotJson String?");
    expect(planService).toContain("checkSheetSnapshotJson: serializePmCheckSheetSnapshot");
    expect(annualService).toContain("checkSheetSnapshotJson:serializePmCheckSheetSnapshot");
    expect(workService).toContain("checkSheetSnapshotJson: serializePmCheckSheetSnapshot");
  });

  it("provides a guarded dry-run/back-up backfill and warns before deleting a Default field", () => {
    expect(backfill).toContain('const apply = args.has("--apply")');
    expect(backfill).toContain("Apply requires --backup=");
    expect(backfill).toContain("Production backfill requires --confirm-production");
    expect(masterData).toContain("อาจกระทบ PM Check Sheet ของเครื่องจักร");
    expect(masterData).toContain("งาน PM ที่สร้าง Snapshot แล้วจะไม่เปลี่ยนย้อนหลัง");
  });

  it("keeps the Supabase table private and grants the server database role", () => {
    expect(supabaseMigration).toContain('ALTER TABLE "PmCheckSheetItem" ENABLE ROW LEVEL SECURITY');
    expect(supabaseMigration).toContain('REVOKE ALL ON TABLE "PmCheckSheetItem" FROM anon, authenticated');
    expect(supabaseMigration).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PmCheckSheetItem" TO prisma');
    expect(supabaseMigration).toContain('TO prisma\nUSING (true)\nWITH CHECK (true)');
  });
});
