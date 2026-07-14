-- Add site-level category scope while keeping organizationId for reporting and legacy data.
ALTER TABLE "Category" ADD COLUMN "plantId" TEXT;

UPDATE "Category"
SET "plantId" = (
  SELECT "Plant"."id"
  FROM "Plant"
  WHERE "Plant"."organizationId" = "Category"."organizationId"
  ORDER BY "Plant"."createdAt" ASC
  LIMIT 1
)
WHERE "plantId" IS NULL
  AND "organizationId" IS NOT NULL;

CREATE UNIQUE INDEX "Category_plantId_name_key" ON "Category"("plantId", "name");
CREATE INDEX "Category_plantId_active_idx" ON "Category"("plantId", "active");
