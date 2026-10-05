PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PmAnnualPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "pmBy" TEXT NOT NULL,
    "scheduleMode" TEXT NOT NULL,
    "patternCycleWeeks" INTEGER NOT NULL DEFAULT 1,
    "rotationAnchorDateKey" TEXT,
    "monthlyWeek5Rule" TEXT NOT NULL DEFAULT 'NO_PM',
    "monthlyPatternVersion" INTEGER NOT NULL DEFAULT 0,
    "monthlyGeneratedVersion" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "activeKey" TEXT,
    "effectiveDateKey" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
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
    CHECK ("scheduleMode" IN ('MANUAL', 'WEEKLY_PATTERN', 'MONTHLY_PATTERN')),
    CHECK ("patternCycleWeeks" IN (1, 2)),
    CHECK ("monthlyWeek5Rule" IN ('NO_PM', 'REPEAT_WEEK_1')),
    CHECK ("monthlyPatternVersion" >= 0),
    CHECK ("monthlyGeneratedVersion" >= 0),
    CHECK ("status" IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'CANCELED')),
    CONSTRAINT "PmAnnualPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_plantId_organizationId_fkey" FOREIGN KEY ("plantId", "organizationId") REFERENCES "Plant" ("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_replacementPlanId_fkey" FOREIGN KEY ("replacementPlanId") REFERENCES "PmAnnualPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualPlan_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_PmAnnualPlan" ("activeKey", "activatedAt", "activatedById", "canceledAt", "canceledById", "cancellationReason", "createdAt", "createdById", "effectiveDateKey", "id", "name", "organizationId", "patternCycleWeeks", "plantId", "pmBy", "replacementPlanId", "rotationAnchorDateKey", "scheduleMode", "status", "supersededAt", "supersededById", "updatedAt", "year")
SELECT "activeKey", "activatedAt", "activatedById", "canceledAt", "canceledById", "cancellationReason", "createdAt", "createdById", "effectiveDateKey", "id", "name", "organizationId", "patternCycleWeeks", "plantId", "pmBy", "replacementPlanId", "rotationAnchorDateKey", "scheduleMode", "status", "supersededAt", "supersededById", "updatedAt", "year" FROM "PmAnnualPlan";

DROP TABLE "PmAnnualPlan";
ALTER TABLE "new_PmAnnualPlan" RENAME TO "PmAnnualPlan";
CREATE UNIQUE INDEX "PmAnnualPlan_activeKey_key" ON "PmAnnualPlan"("activeKey");
CREATE UNIQUE INDEX "PmAnnualPlan_replacementPlanId_key" ON "PmAnnualPlan"("replacementPlanId");
CREATE UNIQUE INDEX "PmAnnualPlan_id_plantId_key" ON "PmAnnualPlan"("id", "plantId");
CREATE INDEX "PmAnnualPlan_organizationId_plantId_year_idx" ON "PmAnnualPlan"("organizationId", "plantId", "year");
CREATE INDEX "PmAnnualPlan_plantId_year_status_idx" ON "PmAnnualPlan"("plantId", "year", "status");

CREATE TABLE "PmAnnualMonthlyWeek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK ("weekNumber" BETWEEN 1 AND 4),
    CHECK ("mode" IN ('ASSIGNMENTS', 'NO_PM')),
    CONSTRAINT "PmAnnualMonthlyWeek_planId_plantId_fkey" FOREIGN KEY ("planId", "plantId") REFERENCES "PmAnnualPlan" ("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PmAnnualMonthlyPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "assetSystemId" TEXT,
    "zoneId" TEXT,
    "patternKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK ("weekNumber" BETWEEN 1 AND 4),
    CHECK ("dayOfWeek" BETWEEN 1 AND 7),
    CHECK (("assetSystemId" IS NOT NULL AND "zoneId" IS NULL) OR ("assetSystemId" IS NULL AND "zoneId" IS NOT NULL)),
    CONSTRAINT "PmAnnualMonthlyPattern_planId_plantId_fkey" FOREIGN KEY ("planId", "plantId") REFERENCES "PmAnnualPlan" ("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualMonthlyPattern_assetSystemId_plantId_fkey" FOREIGN KEY ("assetSystemId", "plantId") REFERENCES "AssetSystem" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PmAnnualMonthlyPattern_zoneId_plantId_fkey" FOREIGN KEY ("zoneId", "plantId") REFERENCES "Zone" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PmAnnualMonthlyWeek_planId_weekNumber_key" ON "PmAnnualMonthlyWeek"("planId", "weekNumber");
CREATE INDEX "PmAnnualMonthlyWeek_planId_idx" ON "PmAnnualMonthlyWeek"("planId");
CREATE UNIQUE INDEX "PmAnnualMonthlyPattern_patternKey_key" ON "PmAnnualMonthlyPattern"("patternKey");
CREATE INDEX "PmAnnualMonthlyPattern_planId_weekNumber_displayOrder_idx" ON "PmAnnualMonthlyPattern"("planId", "weekNumber", "displayOrder");
CREATE INDEX "PmAnnualMonthlyPattern_assetSystemId_idx" ON "PmAnnualMonthlyPattern"("assetSystemId");
CREATE INDEX "PmAnnualMonthlyPattern_zoneId_idx" ON "PmAnnualMonthlyPattern"("zoneId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
