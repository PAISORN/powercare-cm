CREATE UNIQUE INDEX "Plant_id_organizationId_key" ON "Plant"("id", "organizationId");
CREATE UNIQUE INDEX "Asset_id_plantId_key" ON "Asset"("id", "plantId");

CREATE TABLE "PmGroup" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "plantId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "firstUsedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmGroup_plant_organization_fkey" FOREIGN KEY ("plantId", "organizationId") REFERENCES "Plant"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PmGroup_id_plantId_key" ON "PmGroup"("id", "plantId");
CREATE TABLE "PmGroupAsset" (
  "id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "pmGroupId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmGroupAsset_group_site_fkey" FOREIGN KEY ("pmGroupId", "plantId") REFERENCES "PmGroup"("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PmGroupAsset_asset_site_fkey" FOREIGN KEY ("assetId", "plantId") REFERENCES "Asset"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmPlanSequence" (
  "id" TEXT PRIMARY KEY, "siteCodeSegment" TEXT NOT NULL,
  "creationDateKey" TEXT NOT NULL, "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmPlanSequence_creationDateKey_check" CHECK ("creationDateKey" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND to_char(to_date("creationDateKey", 'YYYY-MM-DD'), 'YYYY-MM-DD') = "creationDateKey")
);
CREATE TABLE "PmPlan" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "plantId" TEXT NOT NULL,
  "number" TEXT, "creationDateKey" TEXT, "plannedDateKey" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submissionKey" TEXT, "confirmedAt" TIMESTAMP(3),
  "confirmedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "canceledAt" TIMESTAMP(3), "canceledById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cancellationReason" TEXT, "rescheduledAt" TIMESTAMP(3),
  "rescheduledById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "previousPlannedDateKey" TEXT, "rescheduleReason" TEXT, "backdatedAt" TIMESTAMP(3),
  "backdatedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "backdateReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmPlan_plannedDateKey_check" CHECK ("plannedDateKey" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND to_char(to_date("plannedDateKey", 'YYYY-MM-DD'), 'YYYY-MM-DD') = "plannedDateKey"),
  CONSTRAINT "PmPlan_creationDateKey_check" CHECK ("creationDateKey" IS NULL OR ("creationDateKey" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND to_char(to_date("creationDateKey", 'YYYY-MM-DD'), 'YYYY-MM-DD') = "creationDateKey")),
  CONSTRAINT "PmPlan_previousPlannedDateKey_check" CHECK ("previousPlannedDateKey" IS NULL OR ("previousPlannedDateKey" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND to_char(to_date("previousPlannedDateKey", 'YYYY-MM-DD'), 'YYYY-MM-DD') = "previousPlannedDateKey")),
  CONSTRAINT "PmPlan_status_check" CHECK ("status" IN ('DRAFT', 'CONFIRMED', 'CANCELED')),
  CONSTRAINT "PmPlan_plant_organization_fkey" FOREIGN KEY ("plantId", "organizationId") REFERENCES "Plant"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PmPlan_id_plantId_key" ON "PmPlan"("id", "plantId");
CREATE TABLE "PmPlanDraftGroup" (
  "id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "pmPlanId" TEXT NOT NULL,
  "pmGroupId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmPlanDraftGroup_plan_site_fkey" FOREIGN KEY ("pmPlanId", "plantId") REFERENCES "PmPlan"("id", "plantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PmPlanDraftGroup_group_site_fkey" FOREIGN KEY ("pmGroupId", "plantId") REFERENCES "PmGroup"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmPlanGroupSnapshot" (
  "id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "pmPlanId" TEXT NOT NULL,
  "sourcePmGroupId" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL, "nameSnapshot" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmPlanGroupSnapshot_id_pmPlanId_key" UNIQUE ("id", "pmPlanId"),
  CONSTRAINT "PmPlanGroupSnapshot_plan_site_fkey" FOREIGN KEY ("pmPlanId", "plantId") REFERENCES "PmPlan"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmPlanGroupSnapshot_group_site_fkey" FOREIGN KEY ("sourcePmGroupId", "plantId") REFERENCES "PmGroup"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmWork" (
  "id" TEXT PRIMARY KEY, "plantId" TEXT NOT NULL, "pmPlanId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "assetCodeSnapshot" TEXT, "assetNameSnapshot" TEXT NOT NULL, "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED', "result" TEXT, "resultNote" TEXT, "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "completedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "canceledAt" TIMESTAMP(3), "canceledById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cancellationReason" TEXT, "correctedAt" TIMESTAMP(3),
  "correctedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "correctionReason" TEXT, "addedAfterConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmWork_id_pmPlanId_key" UNIQUE ("id", "pmPlanId"),
  CONSTRAINT "PmWork_status_check" CHECK ("status" IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED')),
  CONSTRAINT "PmWork_result_check" CHECK ("result" IS NULL OR "result" IN ('NORMAL', 'ABNORMAL')),
  CONSTRAINT "PmWork_plan_site_fkey" FOREIGN KEY ("pmPlanId", "plantId") REFERENCES "PmPlan"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWork_asset_site_fkey" FOREIGN KEY ("assetId", "plantId") REFERENCES "Asset"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmWorkSourceGroup" (
  "id" TEXT PRIMARY KEY, "pmWorkId" TEXT NOT NULL, "pmPlanId" TEXT NOT NULL,
  "pmPlanGroupSnapshotId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmWorkSourceGroup_pmWork_fkey" FOREIGN KEY ("pmWorkId", "pmPlanId") REFERENCES "PmWork"("id", "pmPlanId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWorkSourceGroup_snapshot_fkey" FOREIGN KEY ("pmPlanGroupSnapshotId", "pmPlanId") REFERENCES "PmPlanGroupSnapshot"("id", "pmPlanId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PmWorkAssignee" (
  "id" TEXT PRIMARY KEY, "pmWorkId" TEXT NOT NULL REFERENCES "PmWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "role" TEXT NOT NULL, "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PmWorkAssignee_role_check" CHECK ("role" IN ('LEAD', 'COLLABORATOR'))
);
ALTER TABLE "CmWork" ADD COLUMN "originatingPmWorkId" TEXT REFERENCES "PmWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PmGroup_plantId_code_key" ON "PmGroup"("plantId", "code");
CREATE INDEX "PmGroup_organizationId_plantId_active_idx" ON "PmGroup"("organizationId", "plantId", "active");
CREATE UNIQUE INDEX "PmGroupAsset_pmGroupId_assetId_key" ON "PmGroupAsset"("pmGroupId", "assetId");
CREATE INDEX "PmGroupAsset_assetId_plantId_idx" ON "PmGroupAsset"("assetId", "plantId");
CREATE UNIQUE INDEX "PmPlanSequence_siteCodeSegment_creationDateKey_key" ON "PmPlanSequence"("siteCodeSegment", "creationDateKey");
CREATE UNIQUE INDEX "PmPlan_number_key" ON "PmPlan"("number");
CREATE UNIQUE INDEX "PmPlan_submissionKey_key" ON "PmPlan"("submissionKey");
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

ALTER TABLE "PmGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmGroupAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmPlanSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmPlanDraftGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmPlanGroupSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmWork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmWorkSourceGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PmWorkAssignee" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "PmGroup", "PmGroupAsset", "PmPlanSequence", "PmPlan", "PmPlanDraftGroup", "PmPlanGroupSnapshot", "PmWork", "PmWorkSourceGroup", "PmWorkAssignee" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PmGroup", "PmGroupAsset", "PmPlanSequence", "PmPlan", "PmPlanDraftGroup", "PmPlanGroupSnapshot", "PmWork", "PmWorkSourceGroup", "PmWorkAssignee" TO prisma;

CREATE POLICY "pm_group_prisma_server_access" ON "PmGroup" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_group_asset_prisma_server_access" ON "PmGroupAsset" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_plan_sequence_prisma_server_access" ON "PmPlanSequence" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_plan_prisma_server_access" ON "PmPlan" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_plan_draft_group_prisma_server_access" ON "PmPlanDraftGroup" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_plan_group_snapshot_prisma_server_access" ON "PmPlanGroupSnapshot" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_work_prisma_server_access" ON "PmWork" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_work_source_group_prisma_server_access" ON "PmWorkSourceGroup" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "pm_work_assignee_prisma_server_access" ON "PmWorkAssignee" FOR ALL TO prisma USING (true) WITH CHECK (true);
