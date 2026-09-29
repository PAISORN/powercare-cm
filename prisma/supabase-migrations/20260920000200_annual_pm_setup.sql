BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "Zone_id_plantId_key" ON "Zone"("id", "plantId");
CREATE TABLE "PmAnnualPlan" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "plantId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "year" INTEGER NOT NULL, "pmBy" TEXT NOT NULL,
  "scheduleMode" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "activeKey" TEXT, "effectiveDateKey" TEXT, "createdById" TEXT NOT NULL,
  "activatedAt" TIMESTAMP(3), "activatedById" TEXT, "supersededAt" TIMESTAMP(3),
  "supersededById" TEXT, "replacementPlanId" TEXT, "canceledAt" TIMESTAMP(3),
  "canceledById" TEXT, "cancellationReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmAnnualPlan_pmBy_check" CHECK ("pmBy" IN ('SYSTEM','ZONE')),
  CONSTRAINT "PmAnnualPlan_scheduleMode_check" CHECK ("scheduleMode" IN ('MANUAL','WEEKLY_PATTERN')),
  CONSTRAINT "PmAnnualPlan_status_check" CHECK ("status" IN ('DRAFT','ACTIVE','SUPERSEDED','CANCELED')),
  CONSTRAINT "PmAnnualPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualPlan_plantId_organizationId_fkey" FOREIGN KEY ("plantId","organizationId") REFERENCES "Plant"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualPlan_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualPlan_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualPlan_replacementPlanId_fkey" FOREIGN KEY ("replacementPlanId") REFERENCES "PmAnnualPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualPlan_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PmAnnualPlan_activeKey_key" ON "PmAnnualPlan"("activeKey");
CREATE UNIQUE INDEX "PmAnnualPlan_replacementPlanId_key" ON "PmAnnualPlan"("replacementPlanId");
CREATE UNIQUE INDEX "PmAnnualPlan_id_plantId_key" ON "PmAnnualPlan"("id","plantId");
CREATE INDEX "PmAnnualPlan_organizationId_plantId_year_idx" ON "PmAnnualPlan"("organizationId","plantId","year");
CREATE INDEX "PmAnnualPlan_plantId_year_status_idx" ON "PmAnnualPlan"("plantId","year","status");
CREATE TABLE "PmAnnualWeeklyPattern" (
  "id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "planId" TEXT NOT NULL, "dayOfWeek" INTEGER NOT NULL,
  "assetSystemId" TEXT, "zoneId" TEXT, "patternKey" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmAnnualWeeklyPattern_day_check" CHECK ("dayOfWeek" BETWEEN 1 AND 7),
  CONSTRAINT "PmAnnualWeeklyPattern_target_check" CHECK (("assetSystemId" IS NOT NULL AND "zoneId" IS NULL) OR ("assetSystemId" IS NULL AND "zoneId" IS NOT NULL)),
  CONSTRAINT "PmAnnualWeeklyPattern_planId_plantId_fkey" FOREIGN KEY ("planId","plantId") REFERENCES "PmAnnualPlan"("id","plantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualWeeklyPattern_assetSystemId_plantId_fkey" FOREIGN KEY ("assetSystemId","plantId") REFERENCES "AssetSystem"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualWeeklyPattern_zoneId_plantId_fkey" FOREIGN KEY ("zoneId","plantId") REFERENCES "Zone"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PmAnnualWeeklyPattern_patternKey_key" ON "PmAnnualWeeklyPattern"("patternKey");
CREATE INDEX "PmAnnualWeeklyPattern_planId_dayOfWeek_idx" ON "PmAnnualWeeklyPattern"("planId","dayOfWeek");
CREATE INDEX "PmAnnualWeeklyPattern_assetSystemId_idx" ON "PmAnnualWeeklyPattern"("assetSystemId");
CREATE INDEX "PmAnnualWeeklyPattern_zoneId_idx" ON "PmAnnualWeeklyPattern"("zoneId");
CREATE TABLE "PmAnnualSchedule" (
  "id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "planId" TEXT NOT NULL, "scheduleDateKey" TEXT NOT NULL,
  "assetSystemId" TEXT, "zoneId" TEXT, "source" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "overrideAction" TEXT, "originalScheduleId" TEXT, "slotKey" TEXT, "note" TEXT, "reason" TEXT,
  "recordedById" TEXT, "releasedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmAnnualSchedule_target_check" CHECK (("assetSystemId" IS NOT NULL AND "zoneId" IS NULL) OR ("assetSystemId" IS NULL AND "zoneId" IS NOT NULL)),
  CONSTRAINT "PmAnnualSchedule_source_check" CHECK ("source" IN ('MANUAL','PATTERN','OVERRIDE')),
  CONSTRAINT "PmAnnualSchedule_status_check" CHECK ("status" IN ('SCHEDULED','MOVED','CANCELED','RELEASED')),
  CONSTRAINT "PmAnnualSchedule_planId_plantId_fkey" FOREIGN KEY ("planId","plantId") REFERENCES "PmAnnualPlan"("id","plantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualSchedule_assetSystemId_plantId_fkey" FOREIGN KEY ("assetSystemId","plantId") REFERENCES "AssetSystem"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualSchedule_zoneId_plantId_fkey" FOREIGN KEY ("zoneId","plantId") REFERENCES "Zone"("id","plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmAnnualSchedule_originalScheduleId_fkey" FOREIGN KEY ("originalScheduleId") REFERENCES "PmAnnualSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PmAnnualSchedule_slotKey_key" ON "PmAnnualSchedule"("slotKey");
CREATE INDEX "PmAnnualSchedule_planId_scheduleDateKey_status_idx" ON "PmAnnualSchedule"("planId","scheduleDateKey","status");
CREATE INDEX "PmAnnualSchedule_assetSystemId_idx" ON "PmAnnualSchedule"("assetSystemId");
CREATE INDEX "PmAnnualSchedule_zoneId_idx" ON "PmAnnualSchedule"("zoneId");
CREATE INDEX "PmAnnualSchedule_originalScheduleId_idx" ON "PmAnnualSchedule"("originalScheduleId");
CREATE TABLE "PmAnnualDayNote" (
  "id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "planId" TEXT NOT NULL, "scheduleDateKey" TEXT NOT NULL,
  "note" TEXT NOT NULL, "updatedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmAnnualDayNote_planId_plantId_fkey" FOREIGN KEY ("planId","plantId") REFERENCES "PmAnnualPlan"("id","plantId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PmAnnualDayNote_planId_scheduleDateKey_key" ON "PmAnnualDayNote"("planId","scheduleDateKey");
CREATE INDEX "PmAnnualDayNote_plantId_scheduleDateKey_idx" ON "PmAnnualDayNote"("plantId","scheduleDateKey");
COMMIT;
