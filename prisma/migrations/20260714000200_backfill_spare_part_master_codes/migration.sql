-- Keep legacy spare parts usable after master-code enforcement.
UPDATE "SparePartCategory"
SET "code" = CASE
  WHEN lower("name") LIKE '%elect%' OR "name" LIKE '%ไฟฟ้า%' THEN 'EI'
  WHEN lower("name") LIKE '%mechan%' OR "name" LIKE '%เครื่องกล%' THEN 'ME'
  WHEN lower("name") LIKE '%instrument%' OR "name" LIKE '%เครื่องมือวัด%' THEN 'INST'
  WHEN lower("name") LIKE '%civil%' OR "name" LIKE '%โยธา%' THEN 'CE'
  WHEN lower("name") = 'other' OR "name" LIKE '%อื่น%' THEN 'OT'
  ELSE 'C' || upper(substr(replace("id", '-', ''), 1, 10))
END
WHERE "code" IS NULL OR trim("code") = '';

INSERT INTO "SparePartType" ("id", "organizationId", "plantId", "code", "name", "active", "createdAt", "updatedAt")
SELECT 'default-type-' || p."id", p."organizationId", p."id", 'GL630105', 'อะไหล่ทั่วไป', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Plant" p
WHERE EXISTS (SELECT 1 FROM "SparePart" sp WHERE sp."plantId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "SparePartType" t WHERE t."plantId" = p."id" AND t."code" = 'GL630105');

INSERT INTO "SparePartStorageZone" ("id", "organizationId", "plantId", "code", "name", "description", "active", "createdAt", "updatedAt")
SELECT 'default-storage-zone-' || p."id", p."organizationId", p."id", '01', 'Zone 01', 'Default storage zone for existing spare parts', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Plant" p
WHERE EXISTS (SELECT 1 FROM "SparePart" sp WHERE sp."plantId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "SparePartStorageZone" z WHERE z."plantId" = p."id" AND z."code" = '01');

INSERT INTO "SparePartCategory" ("id", "organizationId", "plantId", "code", "name", "active", "createdAt", "updatedAt")
SELECT 'default-part-category-' || p."id", p."organizationId", p."id", 'OT', 'Other', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Plant" p
WHERE EXISTS (SELECT 1 FROM "SparePart" sp WHERE sp."plantId" = p."id" AND sp."categoryId" IS NULL)
  AND NOT EXISTS (SELECT 1 FROM "SparePartCategory" c WHERE c."plantId" = p."id" AND c."code" = 'OT');

INSERT INTO "Store" ("id", "organizationId", "plantId", "categoryId", "code", "name", "location", "active", "createdAt", "updatedAt")
SELECT 'default-store-' || p."id", p."organizationId", p."id", NULL, 'SP01', 'Store 1', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Plant" p
WHERE EXISTS (SELECT 1 FROM "SparePart" sp WHERE sp."plantId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "Store" s WHERE s."plantId" = p."id");

UPDATE "SparePart"
SET "itemCode" = "code"
WHERE "itemCode" IS NULL OR trim("itemCode") = '';

UPDATE "SparePart"
SET "categoryId" = (
  SELECT c."id" FROM "SparePartCategory" c
  WHERE c."plantId" = "SparePart"."plantId" AND c."code" = 'OT'
  LIMIT 1
)
WHERE "categoryId" IS NULL;

UPDATE "SparePart"
SET "typeId" = (
  SELECT t."id" FROM "SparePartType" t
  WHERE t."plantId" = "SparePart"."plantId" AND t."code" = 'GL630105'
  LIMIT 1
)
WHERE "typeId" IS NULL;

UPDATE "SparePart"
SET "storageZoneId" = (
  SELECT z."id" FROM "SparePartStorageZone" z
  WHERE z."plantId" = "SparePart"."plantId" AND z."code" = '01'
  LIMIT 1
)
WHERE "storageZoneId" IS NULL;

UPDATE "SparePart"
SET "defaultStoreId" = (
  SELECT s."id" FROM "Store" s
  WHERE s."plantId" = "SparePart"."plantId" AND s."active" = true
  ORDER BY s."createdAt" ASC
  LIMIT 1
)
WHERE "defaultStoreId" IS NULL;
