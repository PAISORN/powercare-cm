-- Move Applicable Zone codes to Site-level reference data. Legacy tables and
-- columns are intentionally retained for rollback safety and can be removed by
-- a later cleanup migration after Production verification.
BEGIN;

CREATE TABLE IF NOT EXISTS "StoreApplicableZone" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "zoneId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreApplicableZone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreApplicableZone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StoreApplicableZone_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StoreApplicableZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

WITH "distinctZones" AS (
  SELECT DISTINCT
    spare."organizationId" AS "organizationId",
    spare."plantId" AS "plantId",
    assignment."zoneId" AS "zoneId"
  FROM "SparePartApplicableZone" assignment
  INNER JOIN "SparePart" spare ON spare."id" = assignment."sparePartId"
),
"rankedZones" AS (
  SELECT
    "organizationId",
    "plantId",
    "zoneId",
    ROW_NUMBER() OVER (PARTITION BY "plantId" ORDER BY "zoneId") AS "zoneNumber"
  FROM "distinctZones"
)
INSERT INTO "StoreApplicableZone" (
  "id", "organizationId", "plantId", "zoneId", "code", "active", "createdAt", "updatedAt"
)
SELECT
  'site-zone-' || "plantId" || '-' || "zoneId",
  "organizationId",
  "plantId",
  "zoneId",
  LPAD("zoneNumber"::TEXT, 2, '0'),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "rankedZones"
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "StoreApplicableZone_plantId_zoneId_key" ON "StoreApplicableZone"("plantId", "zoneId");
CREATE UNIQUE INDEX IF NOT EXISTS "StoreApplicableZone_plantId_code_key" ON "StoreApplicableZone"("plantId", "code");
CREATE INDEX IF NOT EXISTS "StoreApplicableZone_organizationId_active_idx" ON "StoreApplicableZone"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "StoreApplicableZone_plantId_active_idx" ON "StoreApplicableZone"("plantId", "active");
CREATE INDEX IF NOT EXISTS "StoreApplicableZone_zoneId_idx" ON "StoreApplicableZone"("zoneId");

ALTER TABLE "SparePartIssueItem" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;
ALTER TABLE "SparePartIssueItem" ADD COLUMN IF NOT EXISTS "zoneCode" TEXT;
DO $$ BEGIN
  ALTER TABLE "SparePartIssueItem"
    ADD CONSTRAINT "SparePartIssueItem_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "Zone"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "SparePartIssueItem_zoneId_idx" ON "SparePartIssueItem"("zoneId");

ALTER TABLE "StoreApplicableZone" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StoreApplicableZone" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "StoreApplicableZone" TO prisma;
DROP POLICY IF EXISTS "store_applicable_zone_prisma_server_access" ON "StoreApplicableZone";
CREATE POLICY "store_applicable_zone_prisma_server_access"
ON "StoreApplicableZone"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

COMMIT;
