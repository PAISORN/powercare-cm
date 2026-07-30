ALTER TABLE "SparePartIssue" ADD COLUMN "vehicle" TEXT;
ALTER TABLE "SparePartIssue" ADD COLUMN "odometerBefore" DECIMAL;
ALTER TABLE "SparePartIssue" ADD COLUMN "odometerAfter" DECIMAL;
ALTER TABLE "SparePartIssue" ADD COLUMN "dispenserMeterBefore" DECIMAL;
ALTER TABLE "SparePartIssue" ADD COLUMN "dispenserMeterAfter" DECIMAL;
