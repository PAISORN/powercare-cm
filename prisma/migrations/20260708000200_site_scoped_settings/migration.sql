ALTER TABLE "SlaSetting" ADD COLUMN "plantId" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "plantId" TEXT;

ALTER TABLE "SlaSetting"
  ADD CONSTRAINT "SlaSetting_plantId_fkey"
  FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SystemSetting"
  ADD CONSTRAINT "SystemSetting_plantId_fkey"
  FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SlaSetting_plantId_key" ON "SlaSetting"("plantId");
CREATE UNIQUE INDEX "SystemSetting_plantId_key" ON "SystemSetting"("plantId");
