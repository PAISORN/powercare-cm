ALTER TABLE "PmPlan" ADD COLUMN "lastWorkSequence" INTEGER NOT NULL DEFAULT 0;

UPDATE "PmPlan"
SET "lastWorkSequence" = (
  SELECT COUNT(*) FROM "PmWork" WHERE "PmWork"."pmPlanId" = "PmPlan"."id"
);
