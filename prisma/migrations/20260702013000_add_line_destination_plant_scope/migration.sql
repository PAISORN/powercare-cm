ALTER TABLE "LineDestination" ADD COLUMN "plantId" TEXT;

CREATE INDEX "LineDestination_plantId_active_idx" ON "LineDestination"("plantId", "active");

ALTER TABLE "LineDestination"
  ADD CONSTRAINT "LineDestination_plantId_fkey"
  FOREIGN KEY ("plantId") REFERENCES "Plant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
