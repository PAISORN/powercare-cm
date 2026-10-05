BEGIN;

ALTER TABLE "PmAnnualPlan" DROP CONSTRAINT "PmAnnualPlan_scheduleMode_check";
ALTER TABLE "PmAnnualPlan" ADD CONSTRAINT "PmAnnualPlan_scheduleMode_check" CHECK ("scheduleMode" IN ('MANUAL','WEEKLY_PATTERN','MONTHLY_PATTERN'));
ALTER TABLE "PmAnnualPlan" ADD COLUMN "monthlyWeek5Rule" TEXT NOT NULL DEFAULT 'NO_PM';
ALTER TABLE "PmAnnualPlan" ADD COLUMN "monthlyPatternVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PmAnnualPlan" ADD COLUMN "monthlyGeneratedVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PmAnnualPlan" ADD COLUMN "updatedById" TEXT;
ALTER TABLE "PmAnnualPlan" ADD CONSTRAINT "PmAnnualPlan_monthlyWeek5Rule_check" CHECK ("monthlyWeek5Rule" IN ('NO_PM','REPEAT_WEEK_1'));
ALTER TABLE "PmAnnualPlan" ADD CONSTRAINT "PmAnnualPlan_monthlyPatternVersion_check" CHECK ("monthlyPatternVersion" >= 0);
ALTER TABLE "PmAnnualPlan" ADD CONSTRAINT "PmAnnualPlan_monthlyGeneratedVersion_check" CHECK ("monthlyGeneratedVersion" >= 0);
ALTER TABLE "PmAnnualPlan" ADD CONSTRAINT "PmAnnualPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PmAnnualMonthlyWeek" (
  "id" TEXT PRIMARY KEY,
  "plantId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "mode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmAnnualMonthlyWeek_weekNumber_check" CHECK ("weekNumber" BETWEEN 1 AND 4),
  CONSTRAINT "PmAnnualMonthlyWeek_mode_check" CHECK ("mode" IN ('ASSIGNMENTS','NO_PM')),
  CONSTRAINT "PmAnnualMonthlyWeek_planId_plantId_fkey" FOREIGN KEY ("planId","plantId") REFERENCES "PmAnnualPlan"("id","plantId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PmAnnualMonthlyPattern" (
  "id" TEXT PRIMARY KEY,
  "plantId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "assetSystemId" TEXT,
  "zoneId" TEXT,
  "patternKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmAnnualMonthlyPattern_weekNumber_check" CHECK ("weekNumber" BETWEEN 1 AND 4),
  CONSTRAINT "PmAnnualMonthlyPattern_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 1 AND 7),
  CONSTRAINT "PmAnnualMonthlyPattern_target_check" CHECK (("assetSystemId" IS NOT NULL AND "zoneId" IS NULL) OR ("assetSystemId" IS NULL AND "zoneId" IS NOT NULL)),
  CONSTRAINT "PmAnnualMonthlyPattern_planId_plantId_fkey" FOREIGN KEY ("planId","plantId") REFERENCES "PmAnnualPlan"("id","plantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualMonthlyPattern_assetSystemId_plantId_fkey" FOREIGN KEY ("assetSystemId","plantId") REFERENCES "AssetSystem"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualMonthlyPattern_zoneId_plantId_fkey" FOREIGN KEY ("zoneId","plantId") REFERENCES "Zone"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PmAnnualMonthlyWeek_planId_weekNumber_key" ON "PmAnnualMonthlyWeek"("planId","weekNumber");
CREATE INDEX "PmAnnualMonthlyWeek_planId_idx" ON "PmAnnualMonthlyWeek"("planId");
CREATE UNIQUE INDEX "PmAnnualMonthlyPattern_patternKey_key" ON "PmAnnualMonthlyPattern"("patternKey");
CREATE INDEX "PmAnnualMonthlyPattern_planId_weekNumber_displayOrder_idx" ON "PmAnnualMonthlyPattern"("planId","weekNumber","displayOrder");
CREATE INDEX "PmAnnualMonthlyPattern_assetSystemId_idx" ON "PmAnnualMonthlyPattern"("assetSystemId");
CREATE INDEX "PmAnnualMonthlyPattern_zoneId_idx" ON "PmAnnualMonthlyPattern"("zoneId");

COMMIT;
