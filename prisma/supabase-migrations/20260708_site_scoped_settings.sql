ALTER TABLE "SlaSetting" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "plantId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SlaSetting_plantId_fkey'
  ) THEN
    ALTER TABLE "SlaSetting"
      ADD CONSTRAINT "SlaSetting_plantId_fkey"
      FOREIGN KEY ("plantId") REFERENCES "Plant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SystemSetting_plantId_fkey'
  ) THEN
    ALTER TABLE "SystemSetting"
      ADD CONSTRAINT "SystemSetting_plantId_fkey"
      FOREIGN KEY ("plantId") REFERENCES "Plant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SlaSetting_plantId_key" ON "SlaSetting"("plantId");
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_plantId_key" ON "SystemSetting"("plantId");
