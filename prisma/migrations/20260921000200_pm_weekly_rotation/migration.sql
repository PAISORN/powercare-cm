ALTER TABLE "PmAnnualPlan" ADD COLUMN "patternCycleWeeks" INTEGER NOT NULL DEFAULT 1 CHECK ("patternCycleWeeks" IN (1, 2));
ALTER TABLE "PmAnnualPlan" ADD COLUMN "rotationAnchorDateKey" TEXT;
ALTER TABLE "PmAnnualWeeklyPattern" ADD COLUMN "weekIndex" INTEGER NOT NULL DEFAULT 1 CHECK ("weekIndex" IN (1, 2));