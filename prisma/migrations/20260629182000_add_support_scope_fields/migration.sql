ALTER TABLE "AuditEvent" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "plantId" TEXT;
ALTER TABLE "LineGroupDiscovery" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "LineDailyReportSetting" ADD COLUMN "organizationId" TEXT;

UPDATE "AuditEvent" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;
UPDATE "LineGroupDiscovery" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "LineDailyReportSetting" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;

CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");
CREATE INDEX "AuditEvent_plantId_createdAt_idx" ON "AuditEvent"("plantId", "createdAt");
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");
CREATE INDEX "LineGroupDiscovery_organizationId_lastSeenAt_idx" ON "LineGroupDiscovery"("organizationId", "lastSeenAt");
CREATE INDEX "LineDailyReportSetting_organizationId_idx" ON "LineDailyReportSetting"("organizationId");
