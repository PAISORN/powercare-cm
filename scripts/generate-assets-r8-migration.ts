import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assetR8SystemCode, assetR8TypeCode, loadAssetR8, type PreparedAssetR8Row } from "../modules/assets/asset-r8";

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, "prisma/data/assets-rungtiva-sol-r8.xlsx");
const MAPPING = resolve(ROOT, "prisma/data/production-cm-asset-mapping-r8.csv");
const OUTPUT = resolve(ROOT, "prisma/supabase-migrations/20260912000100_replace_assets_with_r8.sql");
const PLANT_ID = "primary-plant";

const q = (value: string | null | undefined) => value == null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
const stableId = (kind: string, value: string) => `asset-r8-${kind}-${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;
const tuples = (rows: string[][]) => rows.map(row => `(${row.join(",")})`).join(",\n");

function readMappings() {
  const lines = readFileSync(MAPPING, "utf8").trim().split(/\r?\n/);
  return lines.slice(1).map(line => {
    const [oldAssetId, oldAssetCode, targetAssetCode, status] = line.split(",");
    if (status !== "CONFIRMED") throw new Error(`Mapping is not confirmed: ${oldAssetId}`);
    return { oldAssetId, oldAssetCode, targetAssetCode };
  });
}

function dominant<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function generate(rows: PreparedAssetR8Row[]) {
  const mappings = readMappings();
  const codes = new Set(rows.map(row => row.code));
  for (const mapping of mappings) if (!codes.has(mapping.targetAssetCode)) throw new Error(`Missing mapping target ${mapping.targetAssetCode}`);

  const systems = [...new Set(rows.map(row => row.systemName))].sort();
  const disciplines = [...new Set(rows.map(row => row.discipline))].sort();
  const types = [...new Set(rows.map(row => row.assetType))].sort();
  const zones = [...new Set(rows.map(row => row.zoneName))].sort();
  const systemIds = new Map(systems.map(name => [name, stableId("system", name)]));
  const classIds = new Map(disciplines.map(name => [name, stableId("class", name)]));
  const typeIds = new Map(types.map(name => [name, stableId("type", name)]));
  const typeDiscipline = new Map(types.map(name => [name, dominant(rows.filter(row => row.assetType === name).map(row => row.discipline))]));
  const typeLevel = new Map(types.map(name => [name, dominant(rows.filter(row => row.assetType === name).map(row => row.assetLevel))]));

  const mappingSql = tuples(mappings.map(row => [q(row.oldAssetId), q(row.oldAssetCode), q(row.targetAssetCode)]));
  const incomingSql = tuples(rows.map(row => [
    q(row.id), q(`asset-r8-token-${createHash("sha256").update(row.code).digest("hex").slice(0, 24)}`), q(row.code), q(row.name),
    q(row.systemName), q(row.zoneName), q(row.assetType), q(row.assetLevel), q(row.parentCode), q(row.discipline), q(row.criticality),
    q(row.manufacturer), q(row.model), q(row.serialNumber), q(row.serialNumber?.replace(/\s+/g, "").toUpperCase() || null),
    q(row.keySpecification), q(row.systemName === "Instrument" || row.systemName === "Control Valve" ? row.code : null),
    q(JSON.stringify({ sourceWorkbook: "assets-rungtiva-sol-r8.xlsx", sourceSheet: row.sourceSheet, sourceRows: row.sourceRows })),
  ]));
  const systemsSql = tuples(systems.map((name, sortOrder) => [q(systemIds.get(name)!), q(PLANT_ID), q(assetR8SystemCode(name)), q(name), q(name), "TRUE", String(sortOrder), "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP"]));
  const classesSql = tuples(disciplines.map(name => [q(classIds.get(name)!), q(PLANT_ID), q(name), q(name), "TRUE", "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP"]));
  const typesSql = tuples(types.map(name => [q(typeIds.get(name)!), q(PLANT_ID), q(classIds.get(typeDiscipline.get(name)!)!), q(assetR8TypeCode(name)), q(name), q(name), q(typeLevel.get(name)!), q(typeDiscipline.get(name)!), "TRUE", "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP"]));
  return `-- Generated from assets-rungtiva-sol-r8.xlsx SHA-256 711ed08fba13865200e2b8c4c112c1f091d50f428e1f936cac670623d30f2978
-- Replaces the primary plant Asset master and remaps every linked CM using the user-confirmed map.
BEGIN;
SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '10min';
LOCK TABLE "CmWork", "PmWork", "PmGroupAsset", "Asset", "Zone" IN SHARE ROW EXCLUSIVE MODE;

CREATE SCHEMA IF NOT EXISTS asset_r8_backup_20260912;
CREATE TABLE asset_r8_backup_20260912."Asset" AS TABLE public."Asset";
CREATE TABLE asset_r8_backup_20260912."AssetSystem" AS TABLE public."AssetSystem";
CREATE TABLE asset_r8_backup_20260912."AssetType" AS TABLE public."AssetType";
CREATE TABLE asset_r8_backup_20260912."AssetClass" AS TABLE public."AssetClass";
CREATE TABLE asset_r8_backup_20260912."AssetFamily" AS TABLE public."AssetFamily";
CREATE TABLE asset_r8_backup_20260912."AssetTechnicalField" AS TABLE public."AssetTechnicalField";
CREATE TABLE asset_r8_backup_20260912."AssetTechnicalValue" AS TABLE public."AssetTechnicalValue";
CREATE TABLE asset_r8_backup_20260912."AssetDocument" AS TABLE public."AssetDocument";
CREATE TABLE asset_r8_backup_20260912."CmWork" AS TABLE public."CmWork";
CREATE TABLE asset_r8_backup_20260912."PmWork" AS TABLE public."PmWork";
CREATE TABLE asset_r8_backup_20260912."PmGroupAsset" AS TABLE public."PmGroupAsset";
CREATE TABLE asset_r8_backup_20260912."Zone" AS TABLE public."Zone";

CREATE TEMP TABLE "_asset_r8_cm_map" ("oldAssetId" TEXT PRIMARY KEY, "oldAssetCode" TEXT NOT NULL, "targetAssetCode" TEXT NOT NULL);
INSERT INTO "_asset_r8_cm_map" VALUES
${mappingSql};

CREATE TEMP TABLE "_asset_r8_incoming" (
  "id" TEXT PRIMARY KEY, "publicToken" TEXT NOT NULL, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
  "systemName" TEXT NOT NULL, "zoneName" TEXT NOT NULL, "assetType" TEXT NOT NULL, "assetLevel" TEXT NOT NULL,
  "parentCode" TEXT, "discipline" TEXT NOT NULL, "criticality" TEXT NOT NULL, "manufacturer" TEXT, "model" TEXT,
  "serialNumber" TEXT, "serialNormalized" TEXT, "keySpecification" TEXT, "tagKks" TEXT, "metadataJson" TEXT
);
INSERT INTO "_asset_r8_incoming" VALUES
${incomingSql};

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_asset_r8_incoming") <> 583 THEN RAISE EXCEPTION 'R8 incoming count must be 583'; END IF;
  IF EXISTS (SELECT 1 FROM "_asset_r8_cm_map" m LEFT JOIN "Asset" a ON a."id"=m."oldAssetId" AND a."plantId"=${q(PLANT_ID)} WHERE a."id" IS NULL OR a."code" IS DISTINCT FROM m."oldAssetCode") THEN RAISE EXCEPTION 'Confirmed CM mapping no longer matches the current Asset master'; END IF;
  IF EXISTS (SELECT 1 FROM "_asset_r8_cm_map" m LEFT JOIN "_asset_r8_incoming" i ON i."code"=m."targetAssetCode" WHERE i."id" IS NULL) THEN RAISE EXCEPTION 'Confirmed CM mapping target is missing from R8'; END IF;
  IF EXISTS (SELECT 1 FROM "CmWork" c JOIN "Asset" a ON a."id"=c."assetId" WHERE a."plantId"=${q(PLANT_ID)} AND NOT EXISTS (SELECT 1 FROM "_asset_r8_cm_map" m WHERE m."oldAssetId"=a."id")) THEN RAISE EXCEPTION 'A linked CM Asset is missing from the confirmed R8 mapping'; END IF;
  IF (SELECT COUNT(*) FROM "CmWork" c JOIN "Asset" a ON a."id"=c."assetId" WHERE a."plantId"=${q(PLANT_ID)}) <> 28 THEN RAISE EXCEPTION 'Linked CM count changed after approval'; END IF;
  IF (SELECT COUNT(DISTINCT c."assetId") FROM "CmWork" c JOIN "Asset" a ON a."id"=c."assetId" WHERE a."plantId"=${q(PLANT_ID)}) <> 22 THEN RAISE EXCEPTION 'Linked CM Asset count changed after approval'; END IF;
  IF EXISTS (SELECT 1 FROM "PmWork" w WHERE w."plantId"=${q(PLANT_ID)}) OR EXISTS (SELECT 1 FROM "PmGroupAsset" g WHERE g."plantId"=${q(PLANT_ID)}) THEN RAISE EXCEPTION 'PM Asset dependency appeared after approval; migration aborted to preserve PM history'; END IF;
END $$;

CREATE TEMP TABLE "_asset_r8_cm_work_remap" AS
SELECT c."id" AS "cmWorkId", i."id" AS "newAssetId"
FROM "CmWork" c
JOIN "Asset" a ON a."id"=c."assetId" AND a."plantId"=${q(PLANT_ID)}
JOIN "_asset_r8_cm_map" m ON m."oldAssetId"=a."id"
JOIN "_asset_r8_incoming" i ON i."code"=m."targetAssetCode";
DO $$ BEGIN IF (SELECT COUNT(*) FROM "_asset_r8_cm_work_remap") <> 28 THEN RAISE EXCEPTION 'Expected 28 CM works in the approved remap'; END IF; END $$;

UPDATE "CmWork" c SET "assetCodeSnapshot"=a."code", "assetNameSnapshot"=COALESCE(a."nameTh",a."nameEn"), "assetId"=NULL
FROM "Asset" a WHERE c."assetId"=a."id" AND a."plantId"=${q(PLANT_ID)};
UPDATE "Asset" SET "parentId"=NULL WHERE "plantId"=${q(PLANT_ID)};
DELETE FROM "AssetTechnicalValue" v USING "Asset" a WHERE v."assetId"=a."id" AND a."plantId"=${q(PLANT_ID)};
DELETE FROM "AssetDocument" d USING "Asset" a WHERE d."assetId"=a."id" AND a."plantId"=${q(PLANT_ID)};
DELETE FROM "Asset" WHERE "plantId"=${q(PLANT_ID)};
DELETE FROM "AssetCodeSequence" WHERE "plantId"=${q(PLANT_ID)};
DELETE FROM "AssetSequence" WHERE "plantId"=${q(PLANT_ID)};
DELETE FROM "AssetTechnicalField" f USING "AssetType" t WHERE f."assetTypeId"=t."id" AND t."plantId"=${q(PLANT_ID)};
DELETE FROM "AssetType" WHERE "plantId"=${q(PLANT_ID)};
DELETE FROM "AssetFamily" WHERE "plantId"=${q(PLANT_ID)};
DELETE FROM "AssetClass" WHERE "plantId"=${q(PLANT_ID)};
DELETE FROM "AssetSystem" WHERE "plantId"=${q(PLANT_ID)};

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Zone" WHERE "plantId"=${q(PLANT_ID)} AND "name"='ASH Handling') AND EXISTS (SELECT 1 FROM "Zone" WHERE "plantId"=${q(PLANT_ID)} AND "name"='ASH handing') THEN RAISE EXCEPTION 'Both ASH Handling Zone spellings exist'; END IF;
  IF EXISTS (SELECT 1 FROM "Zone" WHERE "plantId"=${q(PLANT_ID)} AND "name"='Water Treatment') AND EXISTS (SELECT 1 FROM "Zone" WHERE "plantId"=${q(PLANT_ID)} AND "name"='Water Treatment Plant') THEN RAISE EXCEPTION 'Both Water Treatment Zone names exist'; END IF;
END $$;
UPDATE "Zone" SET "name"='ASH Handling', "active"=TRUE, "updatedAt"=CURRENT_TIMESTAMP WHERE "plantId"=${q(PLANT_ID)} AND "name"='ASH handing';
UPDATE "Zone" SET "name"='Water Treatment', "active"=TRUE, "updatedAt"=CURRENT_TIMESTAMP WHERE "plantId"=${q(PLANT_ID)} AND "name"='Water Treatment Plant';
DO $$ BEGIN
  IF EXISTS (SELECT required.name FROM (VALUES ${zones.map(zone => `(${q(zone)})`).join(",")}) required(name) LEFT JOIN "Zone" z ON z."plantId"=${q(PLANT_ID)} AND z."name"=required.name AND z."active"=TRUE WHERE z."id" IS NULL) THEN RAISE EXCEPTION 'One or more required R8 Zones are missing or inactive'; END IF;
END $$;

INSERT INTO "AssetSystem" ("id","plantId","code","nameTh","nameEn","active","sortOrder","createdAt","updatedAt") VALUES
${systemsSql};
INSERT INTO "AssetClass" ("id","plantId","nameTh","nameEn","active","createdAt","updatedAt") VALUES
${classesSql};
INSERT INTO "AssetType" ("id","plantId","assetClassId","code","nameTh","nameEn","defaultLevel","discipline","active","createdAt","updatedAt") VALUES
${typesSql};

INSERT INTO "Asset" ("id","publicToken","plantId","systemId","assetClassId","assetTypeId","zoneId","parentId","code","assetLevel","discipline","tagKks","keySpecification","metadataJson","nameTh","nameEn","manufacturer","model","serialNumber","serialNormalized","operatingStatus","criticality","registrationStatus","migrationStatus","createdAt","updatedAt")
SELECT i."id",i."publicToken",${q(PLANT_ID)},s."id",c."id",t."id",z."id",NULL,i."code",i."assetLevel",i."discipline",i."tagKks",i."keySpecification",i."metadataJson",i."name",NULL,i."manufacturer",i."model",i."serialNumber",i."serialNormalized",'IN_SERVICE',i."criticality",'ACTIVE','READY',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM "_asset_r8_incoming" i
JOIN "AssetSystem" s ON s."plantId"=${q(PLANT_ID)} AND s."nameTh"=i."systemName"
JOIN "AssetClass" c ON c."plantId"=${q(PLANT_ID)} AND c."nameTh"=i."discipline"
JOIN "AssetType" t ON t."plantId"=${q(PLANT_ID)} AND t."nameTh"=i."assetType"
JOIN "Zone" z ON z."plantId"=${q(PLANT_ID)} AND z."name"=i."zoneName" AND z."active"=TRUE;

UPDATE "Asset" child SET "parentId"=parent."id"
FROM "_asset_r8_incoming" i JOIN "Asset" parent ON parent."plantId"=${q(PLANT_ID)} AND parent."code"=i."parentCode"
WHERE child."id"=i."id" AND i."parentCode" IS NOT NULL;
UPDATE "CmWork" c SET "assetId"=m."newAssetId" FROM "_asset_r8_cm_work_remap" m WHERE c."id"=m."cmWorkId";

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Asset" WHERE "plantId"=${q(PLANT_ID)}) <> 583 THEN RAISE EXCEPTION 'R8 Asset count verification failed'; END IF;
  IF (SELECT COUNT(*) FROM "AssetSystem" WHERE "plantId"=${q(PLANT_ID)}) <> 13 THEN RAISE EXCEPTION 'R8 System count verification failed'; END IF;
  IF (SELECT COUNT(*) FROM "AssetType" WHERE "plantId"=${q(PLANT_ID)}) <> 21 THEN RAISE EXCEPTION 'R8 Asset Type count verification failed'; END IF;
  IF EXISTS (SELECT "code" FROM "Asset" WHERE "plantId"=${q(PLANT_ID)} GROUP BY "code" HAVING COUNT(*)>1) THEN RAISE EXCEPTION 'Duplicate R8 Asset code'; END IF;
  IF EXISTS (SELECT 1 FROM "_asset_r8_incoming" i JOIN "Asset" a ON a."id"=i."id" WHERE i."parentCode" IS NOT NULL AND a."parentId" IS NULL) THEN RAISE EXCEPTION 'R8 parent assignment failed'; END IF;
  IF EXISTS (SELECT 1 FROM "_asset_r8_cm_work_remap" m JOIN "CmWork" c ON c."id"=m."cmWorkId" WHERE c."assetId" IS DISTINCT FROM m."newAssetId") THEN RAISE EXCEPTION 'CM remap verification failed'; END IF;
END $$;
COMMIT;
`;
}

const workbook = loadAssetR8(SOURCE);
if (workbook.sourceSha256 !== "711ed08fba13865200e2b8c4c112c1f091d50f428e1f936cac670623d30f2978") throw new Error("R8 workbook hash changed");
writeFileSync(OUTPUT, generate(workbook.rows), "utf8");
console.log(JSON.stringify({ output: OUTPUT, assets: workbook.rows.length, mappings: readMappings().length }, null, 2));
