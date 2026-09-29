-- CreateTable
CREATE TABLE "PmAnnualPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "pmBy" TEXT NOT NULL,
    "scheduleMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "activeKey" TEXT,
    "effectiveDateKey" TEXT,
    "createdById" TEXT NOT NULL,
    "activatedAt" DATETIME,
    "activatedById" TEXT,
    "supersededAt" DATETIME,
    "supersededById" TEXT,
    "replacementPlanId" TEXT,
    "canceledAt" DATETIME,
    "canceledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK ("pmBy" IN ('SYSTEM', 'ZONE')),
    CHECK ("scheduleMode" IN ('MANUAL', 'WEEKLY_PATTERN')),
    CHECK ("status" IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'CANCELED')),
    CONSTRAINT "PmAnnualPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_plantId_organizationId_fkey" FOREIGN KEY ("plantId", "organizationId") REFERENCES "Plant" ("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_replacementPlanId_fkey" FOREIGN KEY ("replacementPlanId") REFERENCES "PmAnnualPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PmAnnualWeeklyPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "assetSystemId" TEXT,
    "zoneId" TEXT,
    "patternKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK ("dayOfWeek" BETWEEN 1 AND 7),
    CHECK (("assetSystemId" IS NOT NULL AND "zoneId" IS NULL) OR ("assetSystemId" IS NULL AND "zoneId" IS NOT NULL)),
    CONSTRAINT "PmAnnualWeeklyPattern_planId_plantId_fkey" FOREIGN KEY ("planId", "plantId") REFERENCES "PmAnnualPlan" ("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualWeeklyPattern_assetSystemId_plantId_fkey" FOREIGN KEY ("assetSystemId", "plantId") REFERENCES "AssetSystem" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualWeeklyPattern_zoneId_plantId_fkey" FOREIGN KEY ("zoneId", "plantId") REFERENCES "Zone" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PmAnnualSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "scheduleDateKey" TEXT NOT NULL,
    "assetSystemId" TEXT,
    "zoneId" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "overrideAction" TEXT,
    "originalScheduleId" TEXT,
    "slotKey" TEXT,
    "note" TEXT,
    "reason" TEXT,
    "recordedById" TEXT,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK (("assetSystemId" IS NOT NULL AND "zoneId" IS NULL) OR ("assetSystemId" IS NULL AND "zoneId" IS NOT NULL)),
    CHECK ("source" IN ('MANUAL', 'PATTERN', 'OVERRIDE')),
    CHECK ("status" IN ('SCHEDULED', 'MOVED', 'CANCELED', 'RELEASED')),
    CONSTRAINT "PmAnnualSchedule_planId_plantId_fkey" FOREIGN KEY ("planId", "plantId") REFERENCES "PmAnnualPlan" ("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualSchedule_assetSystemId_plantId_fkey" FOREIGN KEY ("assetSystemId", "plantId") REFERENCES "AssetSystem" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualSchedule_zoneId_plantId_fkey" FOREIGN KEY ("zoneId", "plantId") REFERENCES "Zone" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualSchedule_originalScheduleId_fkey" FOREIGN KEY ("originalScheduleId") REFERENCES "PmAnnualSchedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PmAnnualDayNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "scheduleDateKey" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PmAnnualDayNote_planId_plantId_fkey" FOREIGN KEY ("planId", "plantId") REFERENCES "PmAnnualPlan" ("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PmAnnualPlan_activeKey_key" ON "PmAnnualPlan"("activeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PmAnnualPlan_replacementPlanId_key" ON "PmAnnualPlan"("replacementPlanId");

-- CreateIndex
CREATE INDEX "PmAnnualPlan_organizationId_plantId_year_idx" ON "PmAnnualPlan"("organizationId", "plantId", "year");

-- CreateIndex
CREATE INDEX "PmAnnualPlan_plantId_year_status_idx" ON "PmAnnualPlan"("plantId", "year", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PmAnnualPlan_id_plantId_key" ON "PmAnnualPlan"("id", "plantId");

-- CreateIndex
CREATE UNIQUE INDEX "PmAnnualWeeklyPattern_patternKey_key" ON "PmAnnualWeeklyPattern"("patternKey");

-- CreateIndex
CREATE INDEX "PmAnnualWeeklyPattern_planId_dayOfWeek_idx" ON "PmAnnualWeeklyPattern"("planId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "PmAnnualWeeklyPattern_assetSystemId_idx" ON "PmAnnualWeeklyPattern"("assetSystemId");

-- CreateIndex
CREATE INDEX "PmAnnualWeeklyPattern_zoneId_idx" ON "PmAnnualWeeklyPattern"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "PmAnnualSchedule_slotKey_key" ON "PmAnnualSchedule"("slotKey");

-- CreateIndex
CREATE INDEX "PmAnnualSchedule_planId_scheduleDateKey_status_idx" ON "PmAnnualSchedule"("planId", "scheduleDateKey", "status");

-- CreateIndex
CREATE INDEX "PmAnnualSchedule_assetSystemId_idx" ON "PmAnnualSchedule"("assetSystemId");

-- CreateIndex
CREATE INDEX "PmAnnualSchedule_zoneId_idx" ON "PmAnnualSchedule"("zoneId");

-- CreateIndex
CREATE INDEX "PmAnnualSchedule_originalScheduleId_idx" ON "PmAnnualSchedule"("originalScheduleId");

-- CreateIndex
CREATE INDEX "PmAnnualDayNote_plantId_scheduleDateKey_idx" ON "PmAnnualDayNote"("plantId", "scheduleDateKey");

-- CreateIndex
CREATE UNIQUE INDEX "PmAnnualDayNote_planId_scheduleDateKey_key" ON "PmAnnualDayNote"("planId", "scheduleDateKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Zone_id_plantId_key" ON "Zone"("id", "plantId");
