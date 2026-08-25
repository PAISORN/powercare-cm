import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const migrationPath = join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260815000100_pm_planning",
  "migration.sql",
);
const workSequenceMigrationPath = join(process.cwd(), "prisma", "migrations", "20260815000200_pm_plan_work_sequence", "migration.sql");
const notificationMigrationPath = join(process.cwd(), "prisma", "migrations", "20260815000300_pm_notification_idempotency", "migration.sql");

describe("PM SQLite migration integration", { timeout: 30_000 }, () => {
  const directory = mkdtempSync(join(tmpdir(), "pm-migration-"));
  const databasePath = join(directory, "pm.db").replaceAll("\\", "/");
  const databaseUrl = `file:${databasePath}`;
  let scriptNumber = 0;

  function execute(sql: string) {
    const file = join(directory, `script-${scriptNumber++}.sql`);
    writeFileSync(file, sql);
    execFileSync(process.execPath, [prismaCli, "db", "execute", "--url", databaseUrl, "--file", file], {
      encoding: "utf8",
      stdio: "pipe",
    });
  }

  beforeAll(() => {
    const bootstrap = `
PRAGMA foreign_keys = ON;
CREATE TABLE "Organization" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "Plant" ("id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL);
CREATE TABLE "Asset" ("id" TEXT NOT NULL PRIMARY KEY, "plantId" TEXT NOT NULL);
CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "CmWork" ("id" TEXT NOT NULL PRIMARY KEY);
INSERT INTO "Organization" ("id") VALUES ('org'), ('org-other');
INSERT INTO "Plant" ("id", "organizationId") VALUES ('plant-a', 'org'), ('plant-b', 'org'), ('plant-other-org', 'org-other');
INSERT INTO "Asset" ("id", "plantId") VALUES ('asset-a', 'plant-a'), ('asset-b', 'plant-b');
INSERT INTO "User" ("id") VALUES ('user-a'), ('user-b');
`;
    const combined = join(directory, "bootstrap-and-migration.sql");
    writeFileSync(combined, `${bootstrap}\n${readFileSync(migrationPath, "utf8")}\n${readFileSync(workSequenceMigrationPath, "utf8")}`);
    execFileSync(
      process.execPath,
      [prismaCli, "db", "execute", "--url", databaseUrl, "--file", combined],
      { encoding: "utf8", stdio: "pipe" },
    );
  });

  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  it("enforces the current-plan partial unique index while retaining canceled history", () => {
    execute(`INSERT INTO "PmPlan" ("id", "organizationId", "plantId", "plannedDateKey", "status", "updatedAt") VALUES ('plan-a', 'org', 'plant-a', '2026-08-15', 'DRAFT', CURRENT_TIMESTAMP);`);
    expect(() =>
      execute(`INSERT INTO "PmPlan" ("id", "organizationId", "plantId", "plannedDateKey", "status", "updatedAt") VALUES ('plan-b', 'org', 'plant-a', '2026-08-15', 'CONFIRMED', CURRENT_TIMESTAMP);`),
    ).toThrow();
    execute(`INSERT INTO "PmPlan" ("id", "organizationId", "plantId", "plannedDateKey", "status", "updatedAt") VALUES ('plan-canceled', 'org', 'plant-a', '2026-08-15', 'CANCELED', CURRENT_TIMESTAMP);`);
  });

  it("enforces lifecycle, result, role, and calendar-key CHECK constraints", () => {
    expect(() =>
      execute(`INSERT INTO "PmPlan" ("id", "organizationId", "plantId", "plannedDateKey", "status", "updatedAt") VALUES ('bad-status', 'org', 'plant-b', '2026-08-16', 'UNKNOWN', CURRENT_TIMESTAMP);`),
    ).toThrow();
    expect(() =>
      execute(`INSERT INTO "PmPlan" ("id", "organizationId", "plantId", "plannedDateKey", "status", "updatedAt") VALUES ('bad-date', 'org', 'plant-b', '2026-02-30', 'DRAFT', CURRENT_TIMESTAMP);`),
    ).toThrow();

    execute(`INSERT INTO "PmWork" ("id", "plantId", "pmPlanId", "assetId", "assetNameSnapshot", "number", "status", "updatedAt") VALUES ('work-a', 'plant-a', 'plan-a', 'asset-a', 'Asset A', 'PM-A', 'PLANNED', CURRENT_TIMESTAMP);`);
    expect(() => execute(`UPDATE "PmWork" SET "status" = 'UNKNOWN' WHERE "id" = 'work-a';`)).toThrow();
    expect(() => execute(`UPDATE "PmWork" SET "result" = 'UNKNOWN' WHERE "id" = 'work-a';`)).toThrow();
    expect(() =>
      execute(`INSERT INTO "PmWorkAssignee" ("id", "pmWorkId", "userId", "role") VALUES ('assignee-bad', 'work-a', 'user-a', 'OWNER');`),
    ).toThrow();
  });

  it("enforces one lead per work and same-plan source provenance", () => {
    execute(`INSERT INTO "PmWorkAssignee" ("id", "pmWorkId", "userId", "role") VALUES ('lead-a', 'work-a', 'user-a', 'LEAD');`);
    expect(() =>
      execute(`INSERT INTO "PmWorkAssignee" ("id", "pmWorkId", "userId", "role") VALUES ('lead-b', 'work-a', 'user-b', 'LEAD');`),
    ).toThrow();

    execute(`INSERT INTO "PmGroup" ("id", "organizationId", "plantId", "code", "name", "updatedAt") VALUES ('group-a', 'org', 'plant-a', 'A', 'Group A', CURRENT_TIMESTAMP);`);
    execute(`INSERT INTO "PmPlanGroupSnapshot" ("id", "plantId", "pmPlanId", "sourcePmGroupId", "codeSnapshot", "nameSnapshot") VALUES ('snapshot-canceled', 'plant-a', 'plan-canceled', 'group-a', 'A', 'Group A');`);
    expect(() =>
      execute(`INSERT INTO "PmWorkSourceGroup" ("id", "pmWorkId", "pmPlanId", "pmPlanGroupSnapshotId") VALUES ('source-cross-plan', 'work-a', 'plan-a', 'snapshot-canceled');`),
    ).toThrow();
  });

  it("rejects mismatched Organization/Site ownership and cross-Site PM links", () => {
    expect(() =>
      execute(`INSERT INTO "PmGroup" ("id", "organizationId", "plantId", "code", "name", "updatedAt") VALUES ('group-bad-org', 'org-other', 'plant-a', 'BAD', 'Bad', CURRENT_TIMESTAMP);`),
    ).toThrow();
    expect(() =>
      execute(`INSERT INTO "PmPlan" ("id", "organizationId", "plantId", "plannedDateKey", "status", "updatedAt") VALUES ('plan-bad-org', 'org-other', 'plant-b', '2026-08-17', 'DRAFT', CURRENT_TIMESTAMP);`),
    ).toThrow();

    execute(`INSERT INTO "PmGroup" ("id", "organizationId", "plantId", "code", "name", "updatedAt") VALUES ('group-b', 'org', 'plant-b', 'B', 'Group B', CURRENT_TIMESTAMP);`);
    expect(() =>
      execute(`INSERT INTO "PmGroupAsset" ("id", "plantId", "pmGroupId", "assetId") VALUES ('membership-cross-site', 'plant-a', 'group-b', 'asset-a');`),
    ).toThrow();
    expect(() =>
      execute(`INSERT INTO "PmPlanDraftGroup" ("id", "plantId", "pmPlanId", "pmGroupId") VALUES ('draft-cross-site', 'plant-a', 'plan-a', 'group-b');`),
    ).toThrow();
    expect(() =>
      execute(`INSERT INTO "PmPlanGroupSnapshot" ("id", "plantId", "pmPlanId", "sourcePmGroupId", "codeSnapshot", "nameSnapshot") VALUES ('snapshot-cross-site', 'plant-a', 'plan-a', 'group-b', 'B', 'Group B');`),
    ).toThrow();
    expect(() =>
      execute(`INSERT INTO "PmWork" ("id", "plantId", "pmPlanId", "assetId", "assetNameSnapshot", "number", "status", "updatedAt") VALUES ('work-cross-site', 'plant-a', 'plan-a', 'asset-b', 'Asset B', 'PM-B', 'PLANNED', CURRENT_TIMESTAMP);`),
    ).toThrow();
  });

  it("globally reserves each normalized Site segment/date sequence", () => {
    execute(`INSERT INTO "PmPlanSequence" ("id", "siteCodeSegment", "creationDateKey", "lastNumber", "updatedAt") VALUES ('sequence-a', 'RTB', '2026-08-15', 1, CURRENT_TIMESTAMP);`);
    expect(() =>
      execute(`INSERT INTO "PmPlanSequence" ("id", "siteCodeSegment", "creationDateKey", "lastNumber", "updatedAt") VALUES ('sequence-b', 'RTB', '2026-08-15', 1, CURRENT_TIMESTAMP);`),
    ).toThrow();
  });
});

describe("PM per-plan work sequence migration", { timeout: 30_000 }, () => {
  it("backfills the persisted suffix from existing work rows", async () => {
    const directory = mkdtempSync(join(tmpdir(), "pm-work-sequence-"));
    const databasePath = join(directory, "pm.db").replaceAll("\\", "/");
    const databaseUrl = `file:${databasePath}`;
    const bootstrap = join(directory, "bootstrap.sql");
    writeFileSync(bootstrap, `CREATE TABLE "PmPlan" ("id" TEXT PRIMARY KEY); CREATE TABLE "PmWork" ("id" TEXT PRIMARY KEY, "pmPlanId" TEXT NOT NULL); INSERT INTO "PmPlan" ("id") VALUES ('plan'); INSERT INTO "PmWork" ("id", "pmPlanId") VALUES ('w1','plan'),('w2','plan');`);
    execFileSync(process.execPath, [prismaCli, "db", "execute", "--url", databaseUrl, "--file", bootstrap], { stdio: "pipe" });
    execFileSync(process.execPath, [prismaCli, "db", "execute", "--url", databaseUrl, "--file", workSequenceMigrationPath], { stdio: "pipe" });
    const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      const rows = await client.$queryRawUnsafe<Array<{ lastWorkSequence: bigint | number }>>('SELECT "lastWorkSequence" FROM "PmPlan" WHERE "id" = \'plan\'');
      expect(Number(rows[0].lastWorkSequence)).toBe(2);
    } finally { await client.$disconnect(); rmSync(directory, { recursive: true, force: true }); }
  });
});

describe("PM notification idempotency migration", { timeout: 30_000 }, () => {
  it("persists and uniquely enforces recipient/event/work/date dispatch keys", async () => {
    const directory = mkdtempSync(join(tmpdir(), "pm-notification-migration-"));
    const databasePath = join(directory, "pm.db").replaceAll("\\", "/");
    const databaseUrl = `file:${databasePath}`;
    const bootstrap = join(directory, "bootstrap.sql");
    writeFileSync(bootstrap, `CREATE TABLE "UserNotification" ("id" TEXT PRIMARY KEY, "recipientId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "title" TEXT NOT NULL, "message" TEXT NOT NULL); CREATE TABLE "LineDailyReportSetting" ("id" TEXT PRIMARY KEY, "sendTime" TEXT NOT NULL); INSERT INTO "LineDailyReportSetting" ("id","sendTime") VALUES ('daily','14:30');`);
    execFileSync(process.execPath, [prismaCli, "db", "execute", "--url", databaseUrl, "--file", bootstrap], { stdio: "pipe" });
    execFileSync(process.execPath, [prismaCli, "db", "execute", "--url", databaseUrl, "--file", notificationMigrationPath], { stdio: "pipe" });
    const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      await client.$executeRawUnsafe(`INSERT INTO "UserNotification" ("id","recipientId","eventType","entityType","entityId","title","message","dispatchKey") VALUES ('n1','u1','PM_DUE_TODAY','PmWork','w1','Due','Due','PM:u1:PM_DUE_TODAY:w1:2026-08-15')`);
      await expect(client.$executeRawUnsafe(`INSERT INTO "UserNotification" ("id","recipientId","eventType","entityType","entityId","title","message","dispatchKey") VALUES ('n2','u1','PM_DUE_TODAY','PmWork','w1','Due','Due','PM:u1:PM_DUE_TODAY:w1:2026-08-15')`)).rejects.toThrow();
      const settings = await client.$queryRawUnsafe<Array<{ sendTime: string }>>(`SELECT "sendTime" FROM "LineDailyReportSetting" WHERE "id"='daily'`);
      expect(settings[0].sendTime).toBe("08:00");
    } finally { await client.$disconnect(); rmSync(directory, { recursive: true, force: true }); }
  });
});
