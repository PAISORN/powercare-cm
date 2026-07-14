ALTER TABLE "LineDailyReportSetting" ADD COLUMN "plantId" TEXT;

CREATE INDEX "LineDailyReportSetting_plantId_idx" ON "LineDailyReportSetting"("plantId");
