import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ROOT = process.cwd();
const OUTPUT = resolve(
  ROOT,
  "prisma/supabase-migrations/20261006000200_sync_local_technical_field_templates.sql",
);
const SOURCE_PLANT_ID = "primary-plant";
const TARGET_PLANT_ID = "primary-plant";
const TARGET_PLANT_CODE = "rtb";
const BACKUP_SCHEMA = "technical_field_sync_backup_20261006";
// These legacy Local Instrument sub-types were intentionally consolidated into the
// INS Asset Type by the approved R8 Production master. Recreating them here would
// mutate Production Asset master data, so this template-only sync excludes them.
const LOCAL_ONLY_TYPE_CODES = new Set([
  "CON",
  "DPT",
  "FIC",
  "LET",
  "PHT",
  "PSH",
  "PTT",
  "QTC",
  "RTD",
  "TDS",
  "TTT",
  "VIB",
]);

const q = (value: string | null | undefined) =>
  value == null ? "NULL" : `'${value.replaceAll("'", "''")}'`;

const stableId = (typeCode: string, key: string) =>
  `atf-local-${createHash("sha256")
    .update(`${TARGET_PLANT_CODE}:${typeCode}:${key}`)
    .digest("hex")
    .slice(0, 24)}`;

async function main() {
  const plant = await db.plant.findUnique({
    where: { id: SOURCE_PLANT_ID },
    select: {
      id: true,
      code: true,
      assetTypes: {
        orderBy: { code: "asc" },
        select: {
          code: true,
          fields: {
            orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
            select: {
              key: true,
              labelTh: true,
              labelEn: true,
              dataType: true,
              unit: true,
              helpText: true,
              indicatorText: true,
              optionsJson: true,
              required: true,
              active: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  });

  if (!plant) throw new Error(`Local Plant ${SOURCE_PLANT_ID} was not found`);
  if (plant.code.toLowerCase() !== TARGET_PLANT_CODE) {
    throw new Error(
      `Local Plant ${SOURCE_PLANT_ID} must have code ${TARGET_PLANT_CODE}; found ${plant.code}`,
    );
  }

  const allLocalFields = plant.assetTypes.flatMap((assetType) =>
    assetType.fields.map((field) => ({
      plantCode: plant.code.toLowerCase(),
      typeCode: assetType.code,
      ...field,
    })),
  );
  const excludedLocalFields = allLocalFields.filter((field) =>
    LOCAL_ONLY_TYPE_CODES.has(field.typeCode),
  );
  const source = allLocalFields.filter(
    (field) => !LOCAL_ONLY_TYPE_CODES.has(field.typeCode),
  );
  if (source.length === 0) throw new Error("No local Technical Field Templates were found");

  const uniqueKeys = new Set(
    source.map((field) => `${field.plantCode}\u0000${field.typeCode}\u0000${field.key}`),
  );
  if (uniqueKeys.size !== source.length) {
    throw new Error("Duplicate local (Plant, Asset Type, Technical Field key) mapping detected");
  }

  const typeCodes = [...new Set(source.map((field) => field.typeCode))].sort();
  const sourceHash = createHash("sha256")
    .update(JSON.stringify(source))
    .digest("hex");
  const values = source
    .map(
      (field) =>
        `(${[
          q(field.plantCode),
          q(field.typeCode),
          q(field.key),
          q(field.labelTh),
          q(field.labelEn),
          q(field.dataType),
          q(field.unit),
          q(field.helpText),
          q(field.indicatorText),
          q(field.optionsJson),
          field.required ? "TRUE" : "FALSE",
          field.active ? "TRUE" : "FALSE",
          String(field.sortOrder),
          q(stableId(field.typeCode, field.key)),
        ].join(",")})`,
    )
    .join(",\n");

  const sql = `-- Generated from the Local ${SOURCE_PLANT_ID} Technical Field Templates.
-- Source rows: ${source.length}; Asset Types: ${typeCodes.length}; SHA-256: ${sourceHash}
-- Excluded Local-only legacy Instrument sub-types: ${[...LOCAL_ONLY_TYPE_CODES].join(", ")} (${excludedLocalFields.length} rows).
-- Merge-only migration: Production-only templates are not deleted and existing IDs are preserved.
BEGIN;
SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '10min';
LOCK TABLE "Plant", "AssetType", "AssetTechnicalField", "AssetTechnicalValue" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='AssetTechnicalField' AND column_name='helpText'
  ) THEN
    RAISE EXCEPTION 'Production schema is missing AssetTechnicalField.helpText';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='AssetTechnicalField' AND column_name='indicatorText'
  ) THEN
    RAISE EXCEPTION 'Production schema is missing AssetTechnicalField.indicatorText';
  END IF;
  IF (SELECT COUNT(*) FROM "Plant" WHERE "id"=${q(TARGET_PLANT_ID)} AND lower("code")=${q(TARGET_PLANT_CODE)}) <> 1 THEN
    RAISE EXCEPTION 'Production target Plant identity does not match ${TARGET_PLANT_ID}/${TARGET_PLANT_CODE}';
  END IF;
END $$;

CREATE TEMP TABLE "_technical_field_source" (
  "plantCode" TEXT NOT NULL,
  "typeCode" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelTh" TEXT NOT NULL,
  "labelEn" TEXT,
  "dataType" TEXT NOT NULL,
  "unit" TEXT,
  "helpText" TEXT,
  "indicatorText" TEXT,
  "optionsJson" TEXT,
  "required" BOOLEAN NOT NULL,
  "active" BOOLEAN NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "newId" TEXT NOT NULL,
  PRIMARY KEY ("plantCode", "typeCode", "key")
) ON COMMIT DROP;

INSERT INTO "_technical_field_source" VALUES
${values};

DO $$
DECLARE missing_types TEXT;
BEGIN
  IF (SELECT COUNT(*) FROM "_technical_field_source") <> ${source.length} THEN
    RAISE EXCEPTION 'Technical Field source count must be ${source.length}';
  END IF;

  SELECT string_agg(m."typeCode", ', ' ORDER BY m."typeCode") INTO missing_types
  FROM (
    SELECT DISTINCT s."typeCode"
    FROM "_technical_field_source" s
    LEFT JOIN "AssetType" t
      ON t."plantId"=${q(TARGET_PLANT_ID)} AND t."code"=s."typeCode"
    WHERE t."id" IS NULL
  ) m;
  IF missing_types IS NOT NULL THEN
    RAISE EXCEPTION 'Production Asset Types are missing for Local templates: %', missing_types;
  END IF;
END $$;

CREATE SCHEMA ${BACKUP_SCHEMA};
CREATE TABLE ${BACKUP_SCHEMA}."AssetTechnicalField" AS
SELECT f.*
FROM public."AssetTechnicalField" f
JOIN public."AssetType" t ON t."id"=f."assetTypeId"
WHERE t."plantId"=${q(TARGET_PLANT_ID)};
CREATE TABLE ${BACKUP_SCHEMA}."AssetTechnicalValue" AS
SELECT v.*
FROM public."AssetTechnicalValue" v
JOIN public."AssetTechnicalField" f ON f."id"=v."fieldId"
JOIN public."AssetType" t ON t."id"=f."assetTypeId"
WHERE t."plantId"=${q(TARGET_PLANT_ID)};

INSERT INTO "AssetTechnicalField" (
  "id", "assetTypeId", "key", "labelTh", "labelEn", "dataType", "unit",
  "helpText", "indicatorText", "optionsJson", "required", "active", "sortOrder",
  "createdAt", "updatedAt"
)
SELECT
  s."newId", t."id", s."key", s."labelTh", s."labelEn", s."dataType", s."unit",
  s."helpText", s."indicatorText", s."optionsJson", s."required", s."active", s."sortOrder",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_technical_field_source" s
JOIN "AssetType" t
  ON t."plantId"=${q(TARGET_PLANT_ID)} AND t."code"=s."typeCode"
ON CONFLICT ("assetTypeId", "key") DO UPDATE SET
  "labelTh"=EXCLUDED."labelTh",
  "labelEn"=EXCLUDED."labelEn",
  "dataType"=EXCLUDED."dataType",
  "unit"=EXCLUDED."unit",
  "helpText"=EXCLUDED."helpText",
  "indicatorText"=EXCLUDED."indicatorText",
  "optionsJson"=EXCLUDED."optionsJson",
  "required"=EXCLUDED."required",
  "active"=EXCLUDED."active",
  "sortOrder"=EXCLUDED."sortOrder",
  "updatedAt"=CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM "_technical_field_source" s
    JOIN "AssetType" t ON t."plantId"=${q(TARGET_PLANT_ID)} AND t."code"=s."typeCode"
    JOIN "AssetTechnicalField" f ON f."assetTypeId"=t."id" AND f."key"=s."key"
  ) <> ${source.length} THEN
    RAISE EXCEPTION 'Technical Field post-sync count verification failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_technical_field_source" s
    JOIN "AssetType" t ON t."plantId"=${q(TARGET_PLANT_ID)} AND t."code"=s."typeCode"
    JOIN "AssetTechnicalField" f ON f."assetTypeId"=t."id" AND f."key"=s."key"
    WHERE f."labelTh" IS DISTINCT FROM s."labelTh"
       OR f."labelEn" IS DISTINCT FROM s."labelEn"
       OR f."dataType" IS DISTINCT FROM s."dataType"
       OR f."unit" IS DISTINCT FROM s."unit"
       OR f."helpText" IS DISTINCT FROM s."helpText"
       OR f."indicatorText" IS DISTINCT FROM s."indicatorText"
       OR f."optionsJson" IS DISTINCT FROM s."optionsJson"
       OR f."required" IS DISTINCT FROM s."required"
       OR f."active" IS DISTINCT FROM s."active"
       OR f."sortOrder" IS DISTINCT FROM s."sortOrder"
  ) THEN
    RAISE EXCEPTION 'Technical Field post-sync content verification failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ${BACKUP_SCHEMA}."AssetTechnicalField" old
    LEFT JOIN public."AssetTechnicalField" current ON current."id"=old."id"
    WHERE current."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'An existing Production Technical Field ID was removed';
  END IF;

  IF (SELECT COUNT(*) FROM ${BACKUP_SCHEMA}."AssetTechnicalValue") <>
     (SELECT COUNT(*)
      FROM public."AssetTechnicalValue" v
      JOIN public."AssetTechnicalField" f ON f."id"=v."fieldId"
      JOIN public."AssetType" t ON t."id"=f."assetTypeId"
      WHERE t."plantId"=${q(TARGET_PLANT_ID)}) THEN
    RAISE EXCEPTION 'Technical Values changed during template sync';
  END IF;
END $$;

COMMIT;
`;

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, sql, "utf8");
  console.log(
    JSON.stringify(
      {
        output: OUTPUT,
        plantId: plant.id,
        plantCode: plant.code,
        assetTypes: typeCodes.length,
        technicalFields: source.length,
        localTechnicalFields: allLocalFields.length,
        excludedLocalOnlyFields: excludedLocalFields.length,
        excludedLocalOnlyTypes: [...LOCAL_ONLY_TYPE_CODES],
        fieldsByAssetType: Object.fromEntries(
          typeCodes.map((typeCode) => [
            typeCode,
            source
              .filter((field) => field.typeCode === typeCode)
              .map((field) => field.key),
          ]),
        ),
        sourceHash,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
