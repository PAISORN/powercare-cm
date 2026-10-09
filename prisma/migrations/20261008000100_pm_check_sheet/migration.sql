-- AlterTable
ALTER TABLE "PmWork" ADD COLUMN "checkSheetSnapshotJson" TEXT;

-- CreateTable
CREATE TABLE "PmCheckSheetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "labelTh" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'TEXT',
    "unit" TEXT,
    "optionsJson" TEXT,
    "helpText" TEXT,
    "indicatorText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PmCheckSheetItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PmCheckSheetItem_assetId_active_sortOrder_idx" ON "PmCheckSheetItem"("assetId", "active", "sortOrder");
