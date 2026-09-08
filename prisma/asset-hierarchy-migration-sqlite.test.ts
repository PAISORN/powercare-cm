import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const migration = readFileSync(join(process.cwd(), "prisma", "migrations", "20260908000100_asset_hierarchy_refactor", "migration.sql"), "utf8");

describe("Asset hierarchy SQLite migration", { timeout: 30_000 }, () => {
  const directory = mkdtempSync(join(tmpdir(), "asset-hierarchy-migration-"));
  const databasePath = join(directory, "assets.db").replaceAll("\\", "/");
  const databaseUrl = `file:${databasePath}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  function execute(sql: string, name: string) {
    const path = join(directory, `${name}.sql`);
    writeFileSync(path, sql);
    execFileSync(process.execPath, [prismaCli, "db", "execute", "--url", databaseUrl, "--file", path], { encoding: "utf8", stdio: "pipe" });
  }

  beforeAll(() => {
    const oldSchema = `
PRAGMA foreign_keys=ON;
CREATE TABLE "Plant" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "AssetClass" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "AssetType" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "AssetFamily" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "Zone" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "Asset" (
 "id" TEXT NOT NULL PRIMARY KEY, "publicToken" TEXT NOT NULL UNIQUE, "plantId" TEXT NOT NULL,
 "familyId" TEXT NOT NULL, "assetClassId" TEXT NOT NULL, "assetTypeId" TEXT, "zoneId" TEXT, "parentId" TEXT,
 "code" TEXT UNIQUE, "sequence" INTEGER, "componentCode" TEXT, "nameTh" TEXT NOT NULL, "nameEn" TEXT,
 "installationLocation" TEXT, "manufacturer" TEXT, "model" TEXT, "serialNumber" TEXT, "serialNormalized" TEXT,
 "installedAt" DATETIME, "commissionedAt" DATETIME, "operatingStatus" TEXT NOT NULL DEFAULT 'IN_SERVICE',
 "criticality" TEXT NOT NULL DEFAULT 'MEDIUM', "registrationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
 "cancellationReason" TEXT, "imageFileName" TEXT, "imageMimeType" TEXT, "imageFileSize" INTEGER,
 "imageStoragePath" TEXT, "qrOverrideJson" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL, FOREIGN KEY("parentId") REFERENCES "Asset"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "Asset_parentId_componentCode_key" ON "Asset"("parentId","componentCode");
CREATE UNIQUE INDEX "Asset_id_plantId_key" ON "Asset"("id","plantId");
CREATE TABLE "CmWork" ("id" TEXT PRIMARY KEY, "assetId" TEXT, FOREIGN KEY("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL);
CREATE TABLE "PmWork" ("id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "assetId" TEXT NOT NULL, FOREIGN KEY("assetId","plantId") REFERENCES "Asset"("id","plantId") ON DELETE RESTRICT);
CREATE TABLE "AssetDocument" ("id" TEXT PRIMARY KEY, "assetId" TEXT NOT NULL, FOREIGN KEY("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE);
INSERT INTO "Plant" VALUES ('site-a'),('site-b'); INSERT INTO "AssetClass" VALUES ('class'); INSERT INTO "AssetType" VALUES ('type'); INSERT INTO "AssetFamily" VALUES ('family'); INSERT INTO "Zone" VALUES ('zone');
INSERT INTO "Asset" ("id","publicToken","plantId","familyId","assetClassId","assetTypeId","zoneId","parentId","code","sequence","componentCode","nameTh","updatedAt") VALUES
 ('main','token-main','site-a','family','class','type','zone',NULL,'MAIN-001',1,NULL,'Main',CURRENT_TIMESTAMP),
 ('child','token-child','site-a','family','class','type','zone','main','CHILD-001',1,'CHILD','Child',CURRENT_TIMESTAMP);
INSERT INTO "CmWork" VALUES ('cm','child'); INSERT INTO "PmWork" VALUES ('pm','site-a','child'); INSERT INTO "AssetDocument" VALUES ('doc','child');
`;
    execute(`${oldSchema}\n${migration}`, "bootstrap-and-migrate");
  });
  afterAll(async () => { await prisma.$disconnect(); rmSync(directory, { recursive: true, force: true }); });

  it("preserves Asset identity, hierarchy and maintenance/document references", async () => {
    const assets = await prisma.asset.findMany({ select: { id: true, code: true, parentId: true, migrationStatus: true }, orderBy: { id: "asc" } });
    expect(assets).toEqual([
      { id: "child", code: "CHILD-001", parentId: "main", migrationStatus: "NEED_REVIEW" },
      { id: "main", code: "MAIN-001", parentId: null, migrationStatus: "NEED_REVIEW" },
    ]);
    const refs = await prisma.$queryRawUnsafe<Array<{ cm: bigint; pm: bigint; docs: bigint }>>('SELECT (SELECT COUNT(*) FROM "CmWork") cm, (SELECT COUNT(*) FROM "PmWork") pm, (SELECT COUNT(*) FROM "AssetDocument") docs');
    expect(Number(refs[0].cm)).toBe(1); expect(Number(refs[0].pm)).toBe(1); expect(Number(refs[0].docs)).toBe(1);
    expect(await prisma.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check")).toEqual([]);
  });

  it("enforces same-Site System and Parent references", async () => {
    await prisma.assetSystem.createMany({ data: [
      { id: "system-a", plantId: "site-a", code: "A", nameTh: "System A" },
      { id: "system-b", plantId: "site-b", code: "B", nameTh: "System B" },
    ] });
    await prisma.asset.create({ data: { id: "other-main", publicToken: "other-token", plantId: "site-b", code: "OTHER", nameTh: "Other", systemId: "system-b", assetLevel: "MAIN_ASSET", migrationStatus: "READY" } });
    await expect(prisma.asset.update({ where: { id: "child" }, data: { systemId: "system-b" } })).rejects.toThrow();
    await expect(prisma.asset.update({ where: { id: "child" }, data: { parentId: "other-main" } })).rejects.toThrow();
  });
});
