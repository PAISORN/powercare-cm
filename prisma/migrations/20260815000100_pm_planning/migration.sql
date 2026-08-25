CREATE TABLE "PmGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "firstUsedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PmGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmGroup_plant_organization_fkey" FOREIGN KEY ("plantId", "organizationId") REFERENCES "Plant" ("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PmGroupAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "plantId" TEXT NOT NULL,
  "pmGroupId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmGroupAsset_group_site_fkey" FOREIGN KEY ("pmGroupId", "plantId") REFERENCES "PmGroup" ("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PmGroupAsset_asset_site_fkey" FOREIGN KEY ("assetId", "plantId") REFERENCES "Asset" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PmPlanSequence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteCodeSegment" TEXT NOT NULL,
  "creationDateKey" TEXT NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PmPlanSequence_creationDateKey_check" CHECK (length("creationDateKey") = 10 AND "creationDateKey" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND strftime('%Y-%m-%d', "creationDateKey") = "creationDateKey")
);

CREATE TABLE "PmPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "number" TEXT,
  "creationDateKey" TEXT,
  "plannedDateKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submissionKey" TEXT,
  "confirmedAt" DATETIME,
  "confirmedById" TEXT,
  "canceledAt" DATETIME,
  "canceledById" TEXT,
  "cancellationReason" TEXT,
  "rescheduledAt" DATETIME,
  "rescheduledById" TEXT,
  "previousPlannedDateKey" TEXT,
  "rescheduleReason" TEXT,
  "backdatedAt" DATETIME,
  "backdatedById" TEXT,
  "backdateReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PmPlan_plannedDateKey_check" CHECK (length("plannedDateKey") = 10 AND "plannedDateKey" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND strftime('%Y-%m-%d', "plannedDateKey") = "plannedDateKey"),
  CONSTRAINT "PmPlan_creationDateKey_check" CHECK ("creationDateKey" IS NULL OR (length("creationDateKey") = 10 AND "creationDateKey" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND strftime('%Y-%m-%d', "creationDateKey") = "creationDateKey")),
  CONSTRAINT "PmPlan_previousPlannedDateKey_check" CHECK ("previousPlannedDateKey" IS NULL OR (length("previousPlannedDateKey") = 10 AND "previousPlannedDateKey" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND strftime('%Y-%m-%d', "previousPlannedDateKey") = "previousPlannedDateKey")),
  CONSTRAINT "PmPlan_status_check" CHECK ("status" IN ('DRAFT', 'CONFIRMED', 'CANCELED')),
  CONSTRAINT "PmPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmPlan_plant_organization_fkey" FOREIGN KEY ("plantId", "organizationId") REFERENCES "Plant" ("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmPlan_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmPlan_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmPlan_rescheduledById_fkey" FOREIGN KEY ("rescheduledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmPlan_backdatedById_fkey" FOREIGN KEY ("backdatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PmPlanDraftGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "plantId" TEXT NOT NULL,
  "pmPlanId" TEXT NOT NULL,
  "pmGroupId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmPlanDraftGroup_plan_site_fkey" FOREIGN KEY ("pmPlanId", "plantId") REFERENCES "PmPlan" ("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PmPlanDraftGroup_group_site_fkey" FOREIGN KEY ("pmGroupId", "plantId") REFERENCES "PmGroup" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PmPlanGroupSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "plantId" TEXT NOT NULL,
  "pmPlanId" TEXT NOT NULL,
  "sourcePmGroupId" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmPlanGroupSnapshot_id_pmPlanId_key" UNIQUE ("id", "pmPlanId"),
  CONSTRAINT "PmPlanGroupSnapshot_plan_site_fkey" FOREIGN KEY ("pmPlanId", "plantId") REFERENCES "PmPlan" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmPlanGroupSnapshot_group_site_fkey" FOREIGN KEY ("sourcePmGroupId", "plantId") REFERENCES "PmGroup" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PmWork" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "plantId" TEXT NOT NULL,
  "pmPlanId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "assetCodeSnapshot" TEXT,
  "assetNameSnapshot" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "result" TEXT,
  "resultNote" TEXT,
  "startedAt" DATETIME,
  "completedAt" DATETIME,
  "completedById" TEXT,
  "canceledAt" DATETIME,
  "canceledById" TEXT,
  "cancellationReason" TEXT,
  "correctedAt" DATETIME,
  "correctedById" TEXT,
  "correctionReason" TEXT,
  "addedAfterConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PmWork_id_pmPlanId_key" UNIQUE ("id", "pmPlanId"),
  CONSTRAINT "PmWork_status_check" CHECK ("status" IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED')),
  CONSTRAINT "PmWork_result_check" CHECK ("result" IS NULL OR "result" IN ('NORMAL', 'ABNORMAL')),
  CONSTRAINT "PmWork_plan_site_fkey" FOREIGN KEY ("pmPlanId", "plantId") REFERENCES "PmPlan" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWork_asset_site_fkey" FOREIGN KEY ("assetId", "plantId") REFERENCES "Asset" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWork_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWork_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWork_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PmWorkSourceGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pmWorkId" TEXT NOT NULL,
  "pmPlanId" TEXT NOT NULL,
  "pmPlanGroupSnapshotId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmWorkSourceGroup_pmWork_fkey" FOREIGN KEY ("pmWorkId", "pmPlanId") REFERENCES "PmWork" ("id", "pmPlanId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWorkSourceGroup_snapshot_fkey" FOREIGN KEY ("pmPlanGroupSnapshotId", "pmPlanId") REFERENCES "PmPlanGroupSnapshot" ("id", "pmPlanId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PmWorkAssignee" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pmWorkId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedById" TEXT,
  CONSTRAINT "PmWorkAssignee_role_check" CHECK ("role" IN ('LEAD', 'COLLABORATOR')),
  CONSTRAINT "PmWorkAssignee_pmWorkId_fkey" FOREIGN KEY ("pmWorkId") REFERENCES "PmWork" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWorkAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWorkAssignee_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "CmWork" ADD COLUMN "originatingPmWorkId" TEXT REFERENCES "PmWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Plant_id_organizationId_key" ON "Plant"("id", "organizationId");
CREATE UNIQUE INDEX "Asset_id_plantId_key" ON "Asset"("id", "plantId");
CREATE UNIQUE INDEX "PmGroup_plantId_code_key" ON "PmGroup"("plantId", "code");
CREATE UNIQUE INDEX "PmGroup_id_plantId_key" ON "PmGroup"("id", "plantId");
CREATE INDEX "PmGroup_organizationId_plantId_active_idx" ON "PmGroup"("organizationId", "plantId", "active");
CREATE UNIQUE INDEX "PmGroupAsset_pmGroupId_assetId_key" ON "PmGroupAsset"("pmGroupId", "assetId");
CREATE INDEX "PmGroupAsset_assetId_plantId_idx" ON "PmGroupAsset"("assetId", "plantId");
CREATE UNIQUE INDEX "PmPlanSequence_siteCodeSegment_creationDateKey_key" ON "PmPlanSequence"("siteCodeSegment", "creationDateKey");
CREATE UNIQUE INDEX "PmPlan_number_key" ON "PmPlan"("number");
CREATE UNIQUE INDEX "PmPlan_submissionKey_key" ON "PmPlan"("submissionKey");
CREATE UNIQUE INDEX "PmPlan_id_plantId_key" ON "PmPlan"("id", "plantId");
CREATE UNIQUE INDEX "PmPlanDraftGroup_pmPlanId_pmGroupId_key" ON "PmPlanDraftGroup"("pmPlanId", "pmGroupId");
CREATE INDEX "PmPlanDraftGroup_pmGroupId_idx" ON "PmPlanDraftGroup"("pmGroupId");
CREATE INDEX "PmPlan_organizationId_plantId_plannedDateKey_idx" ON "PmPlan"("organizationId", "plantId", "plannedDateKey");
CREATE INDEX "PmPlan_plantId_status_plannedDateKey_idx" ON "PmPlan"("plantId", "status", "plannedDateKey");
CREATE UNIQUE INDEX "PmPlan_current_plant_date_key" ON "PmPlan"("plantId", "plannedDateKey") WHERE "status" <> 'CANCELED';
CREATE UNIQUE INDEX "PmPlanGroupSnapshot_pmPlanId_sourcePmGroupId_key" ON "PmPlanGroupSnapshot"("pmPlanId", "sourcePmGroupId");
CREATE INDEX "PmPlanGroupSnapshot_sourcePmGroupId_idx" ON "PmPlanGroupSnapshot"("sourcePmGroupId");
CREATE UNIQUE INDEX "PmWork_number_key" ON "PmWork"("number");
CREATE UNIQUE INDEX "PmWork_pmPlanId_assetId_key" ON "PmWork"("pmPlanId", "assetId");
CREATE INDEX "PmWork_assetId_status_idx" ON "PmWork"("assetId", "status");
CREATE INDEX "PmWork_pmPlanId_status_idx" ON "PmWork"("pmPlanId", "status");
CREATE UNIQUE INDEX "PmWorkSourceGroup_pmWorkId_pmPlanGroupSnapshotId_key" ON "PmWorkSourceGroup"("pmWorkId", "pmPlanGroupSnapshotId");
CREATE INDEX "PmWorkSourceGroup_pmPlanGroupSnapshotId_idx" ON "PmWorkSourceGroup"("pmPlanGroupSnapshotId");
CREATE INDEX "PmWorkSourceGroup_pmPlanId_idx" ON "PmWorkSourceGroup"("pmPlanId");
CREATE UNIQUE INDEX "PmWorkAssignee_pmWorkId_userId_key" ON "PmWorkAssignee"("pmWorkId", "userId");
CREATE INDEX "PmWorkAssignee_userId_role_idx" ON "PmWorkAssignee"("userId", "role");
CREATE UNIQUE INDEX "PmWorkAssignee_one_lead_key" ON "PmWorkAssignee"("pmWorkId") WHERE "role" = 'LEAD';
CREATE UNIQUE INDEX "CmWork_originatingPmWorkId_key" ON "CmWork"("originatingPmWorkId");
