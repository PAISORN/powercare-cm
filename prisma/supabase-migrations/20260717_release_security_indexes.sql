CREATE INDEX IF NOT EXISTS "LineDeliveryLog_destinationId_idx"
ON "LineDeliveryLog"("destinationId");

ALTER TABLE "LineDailyReportSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LineDailyReportSetting" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "LineDailyReportSetting" TO prisma;

DROP POLICY IF EXISTS "line_daily_report_setting_prisma_server_access"
ON "LineDailyReportSetting";

CREATE POLICY "line_daily_report_setting_prisma_server_access"
ON "LineDailyReportSetting"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
