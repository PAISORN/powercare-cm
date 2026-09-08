-- AlterTable
ALTER TABLE "AssetType" ADD COLUMN "defaultLevel" TEXT;
ALTER TABLE "AssetType" ADD COLUMN "discipline" TEXT;

-- CreateTable
CREATE TABLE "AssetCodeSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetCodeSequence_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssetCodeSequence_plantId_typeCode_key" ON "AssetCodeSequence"("plantId", "typeCode");
CREATE INDEX "AssetCodeSequence_plantId_idx" ON "AssetCodeSequence"("plantId");
-- CreateTable
CREATE TABLE "AssetSystem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetSystem_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AssetSystem_plantId_active_sortOrder_idx" ON "AssetSystem"("plantId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSystem_plantId_code_key" ON "AssetSystem"("plantId", "code");
CREATE UNIQUE INDEX "AssetSystem_id_plantId_key" ON "AssetSystem"("id", "plantId");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemId" TEXT,
    "assetLevel" TEXT NOT NULL DEFAULT 'MAIN_ASSET' CHECK ("assetLevel" IN ('MAIN_ASSET', 'SUB_ASSET', 'PART')),
    "discipline" TEXT,
    "tagKks" TEXT,
    "registrationCode" TEXT,
    "keySpecification" TEXT,
    "metadataJson" TEXT,
    "migrationStatus" TEXT NOT NULL DEFAULT 'NEED_REVIEW',
    "publicToken" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "familyId" TEXT,
    "assetClassId" TEXT,
    "assetTypeId" TEXT,
    "zoneId" TEXT,
    "parentId" TEXT,
    "code" TEXT,
    "sequence" INTEGER,
    "componentCode" TEXT,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "installationLocation" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "serialNormalized" TEXT,
    "installedAt" DATETIME,
    "commissionedAt" DATETIME,
    "operatingStatus" TEXT NOT NULL DEFAULT 'IN_SERVICE',
    "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "registrationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancellationReason" TEXT,
    "imageFileName" TEXT,
    "imageMimeType" TEXT,
    "imageFileSize" INTEGER,
    "imageStoragePath" TEXT,
    "qrOverrideJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_systemId_plantId_fkey" FOREIGN KEY ("systemId", "plantId") REFERENCES "AssetSystem" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "AssetFamily" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_assetClassId_fkey" FOREIGN KEY ("assetClassId") REFERENCES "AssetClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_parentId_plantId_fkey" FOREIGN KEY ("parentId", "plantId") REFERENCES "Asset" ("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("assetClassId", "assetTypeId", "cancellationReason", "code", "commissionedAt", "componentCode", "createdAt", "criticality", "familyId", "id", "imageFileName", "imageFileSize", "imageMimeType", "imageStoragePath", "installationLocation", "installedAt", "manufacturer", "model", "nameEn", "nameTh", "operatingStatus", "parentId", "plantId", "publicToken", "qrOverrideJson", "registrationStatus", "sequence", "serialNormalized", "serialNumber", "updatedAt", "zoneId") SELECT "assetClassId", "assetTypeId", "cancellationReason", "code", "commissionedAt", "componentCode", "createdAt", "criticality", "familyId", "id", "imageFileName", "imageFileSize", "imageMimeType", "imageStoragePath", "installationLocation", "installedAt", "manufacturer", "model", "nameEn", "nameTh", "operatingStatus", "parentId", "plantId", "publicToken", "qrOverrideJson", "registrationStatus", "sequence", "serialNormalized", "serialNumber", "updatedAt", "zoneId" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_publicToken_key" ON "Asset"("publicToken");
CREATE UNIQUE INDEX "Asset_code_key" ON "Asset"("code");
CREATE INDEX "Asset_plantId_registrationStatus_idx" ON "Asset"("plantId", "registrationStatus");
CREATE INDEX "Asset_familyId_idx" ON "Asset"("familyId");
CREATE INDEX "Asset_assetClassId_assetTypeId_idx" ON "Asset"("assetClassId", "assetTypeId");
CREATE INDEX "Asset_zoneId_idx" ON "Asset"("zoneId");
CREATE INDEX "Asset_parentId_idx" ON "Asset"("parentId");
CREATE INDEX "Asset_serialNormalized_idx" ON "Asset"("serialNormalized");
CREATE INDEX "Asset_systemId_idx" ON "Asset"("systemId");
CREATE INDEX "Asset_tagKks_idx" ON "Asset"("tagKks");
CREATE INDEX "Asset_plantId_assetLevel_idx" ON "Asset"("plantId", "assetLevel");
CREATE INDEX "Asset_plantId_migrationStatus_idx" ON "Asset"("plantId", "migrationStatus");
CREATE UNIQUE INDEX "Asset_parentId_componentCode_key" ON "Asset"("parentId", "componentCode");
CREATE UNIQUE INDEX "Asset_id_plantId_key" ON "Asset"("id", "plantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
