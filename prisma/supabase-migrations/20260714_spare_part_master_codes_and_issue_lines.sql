-- Configurable spare-part master codes and immutable per-item issue-line numbers.
CREATE TABLE IF NOT EXISTS "SparePartType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SparePartType_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SparePartType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartType_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartStorageZone" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SparePartStorageZone_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SparePartStorageZone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartStorageZone_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "SparePartCategory" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "typeId" TEXT;
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "defaultStoreId" TEXT;
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "storageZoneId" TEXT;
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "reorderPoint" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "SparePartIssueItem" ADD COLUMN IF NOT EXISTS "lineNumber" TEXT;

DO $$ BEGIN
    ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "SparePartType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_defaultStoreId_fkey" FOREIGN KEY ("defaultStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_storageZoneId_fkey" FOREIGN KEY ("storageZoneId") REFERENCES "SparePartStorageZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SparePartIssueItemSequence" (
    "sparePartId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SparePartIssueItemSequence_pkey" PRIMARY KEY ("sparePartId"),
    CONSTRAINT "SparePartIssueItemSequence_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SparePartCategory_plantId_code_key" ON "SparePartCategory"("plantId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartType_plantId_code_key" ON "SparePartType"("plantId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartType_plantId_name_key" ON "SparePartType"("plantId", "name");
CREATE INDEX IF NOT EXISTS "SparePartType_organizationId_active_idx" ON "SparePartType"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "SparePartType_plantId_active_idx" ON "SparePartType"("plantId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartStorageZone_plantId_code_key" ON "SparePartStorageZone"("plantId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartStorageZone_plantId_name_key" ON "SparePartStorageZone"("plantId", "name");
CREATE INDEX IF NOT EXISTS "SparePartStorageZone_organizationId_active_idx" ON "SparePartStorageZone"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "SparePartStorageZone_plantId_active_idx" ON "SparePartStorageZone"("plantId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePart_organizationId_itemCode_key" ON "SparePart"("organizationId", "itemCode");
CREATE INDEX IF NOT EXISTS "SparePart_typeId_active_idx" ON "SparePart"("typeId", "active");
CREATE INDEX IF NOT EXISTS "SparePart_defaultStoreId_active_idx" ON "SparePart"("defaultStoreId", "active");
CREATE INDEX IF NOT EXISTS "SparePart_storageZoneId_active_idx" ON "SparePart"("storageZoneId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartIssueItem_lineNumber_key" ON "SparePartIssueItem"("lineNumber");
