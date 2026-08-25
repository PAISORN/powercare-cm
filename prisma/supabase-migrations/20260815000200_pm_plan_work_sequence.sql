ALTER TABLE "PmPlan" ADD COLUMN "lastWorkSequence" INTEGER NOT NULL DEFAULT 0;

UPDATE "PmPlan"
SET "lastWorkSequence" = work_counts."workCount"
FROM (
  SELECT "pmPlanId", COUNT(*)::INTEGER AS "workCount"
  FROM "PmWork"
  GROUP BY "pmPlanId"
) AS work_counts
WHERE "PmPlan"."id" = work_counts."pmPlanId";
