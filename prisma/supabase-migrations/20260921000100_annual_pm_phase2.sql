BEGIN;

CREATE TABLE "PmAnnualSiteSetting" (
  "plantId" TEXT NOT NULL PRIMARY KEY,
  "releaseWindowDays" INTEGER NOT NULL DEFAULT 30,
  "workloadWarningThreshold" INTEGER NOT NULL DEFAULT 40,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "PmSiteCalendarDay" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "plantId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "PmAnnualReleaseBatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "scheduleDateKey" TEXT NOT NULL,
  "pmPlanId" TEXT NOT NULL,
  "releasedById" TEXT NOT NULL,
  "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmAnnualReleaseBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualReleaseBatch_planId_plantId_fkey" FOREIGN KEY ("planId", "plantId") REFERENCES "PmAnnualPlan" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualReleaseBatch_pmPlanId_fkey" FOREIGN KEY ("pmPlanId") REFERENCES "PmPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmAnnualReleaseSchedule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmAnnualReleaseSchedule_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PmAnnualReleaseBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualReleaseSchedule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PmAnnualSchedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmAnnualReleaseExclusion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmAnnualReleaseExclusion_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PmAnnualReleaseBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualReleaseExclusion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmAnnualWorkSource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pmWorkId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmAnnualWorkSource_pmWorkId_fkey" FOREIGN KEY ("pmWorkId") REFERENCES "PmWork" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualWorkSource_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PmAnnualSchedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PmSiteCalendarDay_plantId_dateKey_type_key" ON "PmSiteCalendarDay"("plantId", "dateKey", "type");
CREATE INDEX "PmSiteCalendarDay_plantId_dateKey_idx" ON "PmSiteCalendarDay"("plantId", "dateKey");
CREATE UNIQUE INDEX "PmAnnualReleaseBatch_pmPlanId_key" ON "PmAnnualReleaseBatch"("pmPlanId");
CREATE INDEX "PmAnnualReleaseBatch_plantId_scheduleDateKey_idx" ON "PmAnnualReleaseBatch"("plantId", "scheduleDateKey");
CREATE INDEX "PmAnnualReleaseBatch_planId_scheduleDateKey_idx" ON "PmAnnualReleaseBatch"("planId", "scheduleDateKey");
CREATE UNIQUE INDEX "PmAnnualReleaseSchedule_batchId_scheduleId_key" ON "PmAnnualReleaseSchedule"("batchId", "scheduleId");
CREATE UNIQUE INDEX "PmAnnualReleaseSchedule_scheduleId_key" ON "PmAnnualReleaseSchedule"("scheduleId");
CREATE UNIQUE INDEX "PmAnnualReleaseExclusion_batchId_assetId_key" ON "PmAnnualReleaseExclusion"("batchId", "assetId");
CREATE INDEX "PmAnnualReleaseExclusion_assetId_idx" ON "PmAnnualReleaseExclusion"("assetId");
CREATE UNIQUE INDEX "PmAnnualWorkSource_pmWorkId_scheduleId_key" ON "PmAnnualWorkSource"("pmWorkId", "scheduleId");
CREATE INDEX "PmAnnualWorkSource_scheduleId_idx" ON "PmAnnualWorkSource"("scheduleId");

COMMIT;
