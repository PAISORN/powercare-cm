-- Replace primary-plant Zones with the normalized R8 AREA / ZONE set.
-- Historical CM and Store references are reassigned before old Zone rows are removed.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';
LOCK TABLE "Zone", "CmWork", "Asset", "StoreApplicableZone", "SparePartIssueItem" IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE "_r8_zone_target" ("name" TEXT PRIMARY KEY, "id" TEXT NOT NULL);
INSERT INTO "_r8_zone_target" ("name","id")
SELECT required."name", z."id"
FROM (VALUES
  ('ASH Handling'),('Boiler&Combustion'),('Cooling Tower'),('ESP'),
  ('Fuel preparation'),('Turbine'),('Vehicle'),('Water Treatment')
) AS required("name")
JOIN "Zone" z ON z."plantId"='primary-plant' AND z."name"=required."name";

DO $$ BEGIN
  IF (SELECT COUNT(*) FROM "_r8_zone_target") <> 8 THEN
    RAISE EXCEPTION 'Expected all 8 normalized R8 Zones before consolidation';
  END IF;
END $$;

UPDATE "Zone" SET "active"=TRUE, "updatedAt"=CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM "_r8_zone_target");

UPDATE "CmWork" c
SET "zoneId" = target."id"
FROM "Zone" old_zone, "_r8_zone_target" target
WHERE target."name" =
  CASE
    WHEN old_zone."name"='Fuel Warehouse' THEN 'Fuel preparation'
    WHEN old_zone."name"='Office' THEN 'Fuel preparation'
    WHEN old_zone."name"='Other' AND c."number" IN ('CM-2026-06-0015') THEN 'Turbine'
    WHEN old_zone."name"='Other' AND c."number" IN ('CM-2026-06-0020','CM-RTB-2026-08-0012') THEN 'ESP'
    WHEN old_zone."name"='Other' AND c."number" IN ('CM-RTB-2026-08-0008') THEN 'Water Treatment'
    WHEN old_zone."name"='Other' AND c."number" IN ('CM-RTB-2026-09-0010') THEN 'Boiler&Combustion'
    ELSE 'Fuel preparation'
  END
  AND c."zoneId"=old_zone."id"
  AND old_zone."plantId"='primary-plant'
  AND old_zone."name" NOT IN (SELECT "name" FROM "_r8_zone_target");

UPDATE "Asset" a
SET "zoneId"=target."id"
FROM "Zone" old_zone, "_r8_zone_target" target
WHERE target."name" =
  CASE
    WHEN old_zone."name" ILIKE '%ash%' THEN 'ASH Handling'
    WHEN old_zone."name" ILIKE '%boiler%' OR old_zone."name" ILIKE '%combustion%' THEN 'Boiler&Combustion'
    WHEN old_zone."name" ILIKE '%cooling%' THEN 'Cooling Tower'
    WHEN old_zone."name" ILIKE '%esp%' THEN 'ESP'
    WHEN old_zone."name" ILIKE '%fuel%' THEN 'Fuel preparation'
    WHEN old_zone."name" ILIKE '%turbine%' OR old_zone."name" ILIKE '%feedwater%' THEN 'Turbine'
    WHEN old_zone."name" ILIKE '%water%' THEN 'Water Treatment'
    ELSE 'Fuel preparation'
  END
  AND a."zoneId"=old_zone."id"
  AND old_zone."plantId"='primary-plant'
  AND old_zone."name" NOT IN (SELECT "name" FROM "_r8_zone_target");

UPDATE "SparePartIssueItem" item
SET "zoneId"=COALESCE(cm."zoneId", fuel."id"),
    "zoneCode"=COALESCE(cm_zone_assignment."code", fuel_assignment."code", item."zoneCode")
FROM "Zone" old_zone
JOIN "_r8_zone_target" fuel ON fuel."name"='Fuel preparation'
JOIN "SparePartIssue" issue ON TRUE
LEFT JOIN "CmWork" cm ON cm."id"=issue."cmWorkId"
LEFT JOIN "StoreApplicableZone" cm_zone_assignment ON cm_zone_assignment."plantId"='primary-plant' AND cm_zone_assignment."zoneId"=cm."zoneId"
LEFT JOIN "StoreApplicableZone" fuel_assignment ON fuel_assignment."plantId"='primary-plant' AND fuel_assignment."zoneId"=fuel."id"
WHERE issue."id"=item."issueId"
  AND item."zoneId"=old_zone."id"
  AND old_zone."plantId"='primary-plant'
  AND old_zone."name" NOT IN (SELECT "name" FROM "_r8_zone_target");

DELETE FROM "StoreApplicableZone" assignment
USING "Zone" old_zone
WHERE assignment."zoneId"=old_zone."id"
  AND old_zone."plantId"='primary-plant'
  AND old_zone."name" NOT IN (SELECT "name" FROM "_r8_zone_target");

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "Zone" z
    WHERE z."plantId"='primary-plant'
      AND z."name" NOT IN (SELECT "name" FROM "_r8_zone_target")
      AND (
        EXISTS (SELECT 1 FROM "CmWork" c WHERE c."zoneId"=z."id")
        OR EXISTS (SELECT 1 FROM "Asset" a WHERE a."zoneId"=z."id")
        OR EXISTS (SELECT 1 FROM "StoreApplicableZone" s WHERE s."zoneId"=z."id")
        OR EXISTS (SELECT 1 FROM "SparePartIssueItem" i WHERE i."zoneId"=z."id")
      )
  ) THEN RAISE EXCEPTION 'Old Zone references remain after R8 consolidation';
  END IF;
END $$;

DELETE FROM "Zone"
WHERE "plantId"='primary-plant'
  AND "name" NOT IN (SELECT "name" FROM "_r8_zone_target");

DO $$ BEGIN
  IF (SELECT COUNT(*) FROM "Zone" WHERE "plantId"='primary-plant') <> 8 THEN
    RAISE EXCEPTION 'Primary plant must contain exactly 8 R8 Zones';
  END IF;
END $$;
COMMIT;
