BEGIN;

ALTER TABLE "PmWork" ADD COLUMN "checkSheetSnapshotJson" TEXT;

CREATE TABLE "PmCheckSheetItem" (
  "id" TEXT PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "labelTh" TEXT NOT NULL,
  "dataType" TEXT NOT NULL DEFAULT 'TEXT',
  "unit" TEXT,
  "optionsJson" TEXT,
  "helpText" TEXT,
  "indicatorText" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT FALSE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmCheckSheetItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PmCheckSheetItem_assetId_active_sortOrder_idx" ON "PmCheckSheetItem"("assetId", "active", "sortOrder");

ALTER TABLE "PmCheckSheetItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PmCheckSheetItem" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PmCheckSheetItem" TO prisma;

DROP POLICY IF EXISTS "pm_check_sheet_item_prisma_server_access" ON "PmCheckSheetItem";
CREATE POLICY "pm_check_sheet_item_prisma_server_access"
ON "PmCheckSheetItem"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

COMMIT;
