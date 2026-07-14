ALTER TABLE "LineDailyReportSetting" ADD COLUMN IF NOT EXISTS "plantId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'LineDailyReportSetting_plantId_idx'
  ) THEN
    CREATE INDEX "LineDailyReportSetting_plantId_idx" ON "LineDailyReportSetting"("plantId");
  END IF;
END $$;
