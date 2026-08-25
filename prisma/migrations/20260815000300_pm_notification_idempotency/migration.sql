ALTER TABLE "UserNotification" ADD COLUMN "dispatchKey" TEXT;

CREATE UNIQUE INDEX "UserNotification_dispatchKey_key" ON "UserNotification"("dispatchKey");

UPDATE "LineDailyReportSetting" SET "sendTime" = '08:00' WHERE "sendTime" <> '08:00';
