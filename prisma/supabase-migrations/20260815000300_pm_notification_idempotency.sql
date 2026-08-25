ALTER TABLE "UserNotification" ADD COLUMN IF NOT EXISTS "dispatchKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "UserNotification_dispatchKey_key" ON "UserNotification"("dispatchKey");

UPDATE "LineDailyReportSetting" SET "sendTime" = '08:00' WHERE "sendTime" <> '08:00';
