-- Add configurable codes and issue-line numbering without invalidating legacy rows.
CREATE TABLE "SparePartType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartType_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SparePartStorageZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartStorageZone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartStorageZone_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "SparePartCategory" ADD COLUMN "code" TEXT;

ALTER TABLE "SparePart" ADD COLUMN "typeId" TEXT REFERENCES "SparePartType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SparePart" ADD COLUMN "defaultStoreId" TEXT REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SparePart" ADD COLUMN "storageZoneId" TEXT REFERENCES "SparePartStorageZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SparePart" ADD COLUMN "reorderPoint" DECIMAL NOT NULL DEFAULT 0;

ALTER TABLE "SparePartIssueItem" ADD COLUMN "lineNumber" TEXT;

CREATE TABLE "SparePartIssueItemSequence" (
    "sparePartId" TEXT NOT NULL PRIMARY KEY,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartIssueItemSequence_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SparePartCategory_plantId_code_key" ON "SparePartCategory"("plantId", "code");
CREATE UNIQUE INDEX "SparePartType_plantId_code_key" ON "SparePartType"("plantId", "code");
CREATE UNIQUE INDEX "SparePartType_plantId_name_key" ON "SparePartType"("plantId", "name");
CREATE INDEX "SparePartType_organizationId_active_idx" ON "SparePartType"("organizationId", "active");
CREATE INDEX "SparePartType_plantId_active_idx" ON "SparePartType"("plantId", "active");
CREATE UNIQUE INDEX "SparePartStorageZone_plantId_code_key" ON "SparePartStorageZone"("plantId", "code");
CREATE UNIQUE INDEX "SparePartStorageZone_plantId_name_key" ON "SparePartStorageZone"("plantId", "name");
CREATE INDEX "SparePartStorageZone_organizationId_active_idx" ON "SparePartStorageZone"("organizationId", "active");
CREATE INDEX "SparePartStorageZone_plantId_active_idx" ON "SparePartStorageZone"("plantId", "active");
CREATE UNIQUE INDEX "SparePart_organizationId_itemCode_key" ON "SparePart"("organizationId", "itemCode");
CREATE INDEX "SparePart_typeId_active_idx" ON "SparePart"("typeId", "active");
CREATE INDEX "SparePart_defaultStoreId_active_idx" ON "SparePart"("defaultStoreId", "active");
CREATE INDEX "SparePart_storageZoneId_active_idx" ON "SparePart"("storageZoneId", "active");
CREATE UNIQUE INDEX "SparePartIssueItem_lineNumber_key" ON "SparePartIssueItem"("lineNumber");
