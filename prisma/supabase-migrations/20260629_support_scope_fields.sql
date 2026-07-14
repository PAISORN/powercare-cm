ALTER TABLE "AuditEvent" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
ALTER TABLE "LineGroupDiscovery" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "LineDailyReportSetting" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE "AuditEvent" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;
UPDATE "LineGroupDiscovery" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "LineDailyReportSetting" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;

CREATE INDEX IF NOT EXISTS "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditEvent_plantId_createdAt_idx" ON "AuditEvent"("plantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "LineGroupDiscovery_organizationId_lastSeenAt_idx" ON "LineGroupDiscovery"("organizationId", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "LineDailyReportSetting_organizationId_idx" ON "LineDailyReportSetting"("organizationId");

ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineGroupDiscovery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineDailyReportSetting" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AuditEvent", "LineGroupDiscovery", "LineDailyReportSetting" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuditEvent", "LineGroupDiscovery", "LineDailyReportSetting" TO prisma;

DROP POLICY IF EXISTS "audit_event_prisma_server_access" ON "AuditEvent";
CREATE POLICY "audit_event_prisma_server_access"
ON "AuditEvent"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "line_group_discovery_prisma_server_access" ON "LineGroupDiscovery";
CREATE POLICY "line_group_discovery_prisma_server_access"
ON "LineGroupDiscovery"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "line_daily_report_setting_prisma_server_access" ON "LineDailyReportSetting";
CREATE POLICY "line_daily_report_setting_prisma_server_access"
ON "LineDailyReportSetting"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
