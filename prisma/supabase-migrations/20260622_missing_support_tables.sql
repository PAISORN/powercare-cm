CREATE TABLE IF NOT EXISTS "PublicFeedback" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "message" TEXT NOT NULL,
  "sourcePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PublicFeedback_createdAt_idx"
ON "PublicFeedback"("createdAt");

CREATE TABLE IF NOT EXISTS "LineDailyReportSetting" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "destinationId" TEXT,
  "sendTime" TEXT NOT NULL DEFAULT '08:00',
  "dateMode" TEXT NOT NULL DEFAULT 'YESTERDAY',
  "templateJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LineDailyReportSetting_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "LineDailyReportSetting"
    ADD CONSTRAINT "LineDailyReportSetting_destinationId_fkey"
    FOREIGN KEY ("destinationId") REFERENCES "LineDestination"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "LineDailyReportSetting_destinationId_idx"
ON "LineDailyReportSetting"("destinationId");
