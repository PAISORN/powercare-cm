ALTER TABLE "SparePartIssue" ADD COLUMN IF NOT EXISTS "vehicle" TEXT;
ALTER TABLE "SparePartIssue" ADD COLUMN IF NOT EXISTS "odometerBefore" DECIMAL(18, 2);
ALTER TABLE "SparePartIssue" ADD COLUMN IF NOT EXISTS "odometerAfter" DECIMAL(18, 2);
ALTER TABLE "SparePartIssue" ADD COLUMN IF NOT EXISTS "dispenserMeterBefore" DECIMAL(18, 2);
ALTER TABLE "SparePartIssue" ADD COLUMN IF NOT EXISTS "dispenserMeterAfter" DECIMAL(18, 2);

UPDATE "Plant"
SET "publicStoreIssueContactRequired" = FALSE
WHERE "publicStoreIssueContactRequired" = TRUE;
