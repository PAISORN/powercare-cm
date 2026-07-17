ALTER TABLE "LineDestination" ADD COLUMN IF NOT EXISTS "plantId" TEXT;

DO $$ BEGIN
  ALTER TABLE "LineDestination"
    ADD CONSTRAINT "LineDestination_plantId_fkey"
    FOREIGN KEY ("plantId") REFERENCES "Plant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "LineDestination_plantId_active_idx"
ON "LineDestination"("plantId", "active");
