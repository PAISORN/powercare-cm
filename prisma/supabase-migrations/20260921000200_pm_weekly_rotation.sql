BEGIN;

ALTER TABLE "PmAnnualPlan" ADD COLUMN "patternCycleWeeks" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PmAnnualPlan" ADD COLUMN "rotationAnchorDateKey" TEXT;
ALTER TABLE "PmAnnualPlan" ADD CONSTRAINT "PmAnnualPlan_patternCycleWeeks_check" CHECK ("patternCycleWeeks" IN (1, 2));
ALTER TABLE "PmAnnualWeeklyPattern" ADD COLUMN "weekIndex" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PmAnnualWeeklyPattern" ADD CONSTRAINT "PmAnnualWeeklyPattern_weekIndex_check" CHECK ("weekIndex" IN (1, 2));

COMMIT;
