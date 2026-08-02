-- Assets registry foundation
ALTER TABLE "CmWork" ADD COLUMN "assetId" TEXT;
ALTER TABLE "CmWork" ADD COLUMN "assetCodeSnapshot" TEXT;
ALTER TABLE "CmWork" ADD COLUMN "assetNameSnapshot" TEXT;

-- CreateTable
CREATE TABLE "AssetSystem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetSystem_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetClass_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "assetClassId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetType_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetType_assetClassId_fkey" FOREIGN KEY ("assetClassId") REFERENCES "AssetClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetTechnicalField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetTypeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelTh" TEXT NOT NULL,
    "labelEn" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'TEXT',
    "unit" TEXT,
    "optionsJson" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetTechnicalField_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetFamily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetFamily_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetFamily_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AssetSystem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetSequence_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetSequence_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AssetSystem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetSequence_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "AssetFamily" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicToken" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "assetClassId" TEXT NOT NULL,
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
    "installedAt" TIMESTAMP(3),
    "commissionedAt" TIMESTAMP(3),
    "operatingStatus" TEXT NOT NULL DEFAULT 'IN_SERVICE',
    "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "registrationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancellationReason" TEXT,
    "imageFileName" TEXT,
    "imageMimeType" TEXT,
    "imageFileSize" INTEGER,
    "imageStoragePath" TEXT,
    "qrOverrideJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AssetSystem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "AssetFamily" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_assetClassId_fkey" FOREIGN KEY ("assetClassId") REFERENCES "AssetClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetTechnicalValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "fieldId" TEXT,
    "customLabel" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'TEXT',
    "unit" TEXT,
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetTechnicalValue_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetTechnicalValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "AssetTechnicalField" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "customCategory" TEXT,
    "title" TEXT NOT NULL,
    "revision" TEXT,
    "documentDate" TIMESTAMP(3),
    "note" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publicVisible" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "canceledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetQrSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "showImage" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showManufacturer" BOOLEAN NOT NULL DEFAULT true,
    "showModel" BOOLEAN NOT NULL DEFAULT true,
    "showSerialNumber" BOOLEAN NOT NULL DEFAULT false,
    "showTechnical" BOOLEAN NOT NULL DEFAULT false,
    "showLastCmDate" BOOLEAN NOT NULL DEFAULT true,
    "showLastCmTitle" BOOLEAN NOT NULL DEFAULT false,
    "showLastCmOutcome" BOOLEAN NOT NULL DEFAULT false,
    "showLastPmDate" BOOLEAN NOT NULL DEFAULT true,
    "showLastPmTitle" BOOLEAN NOT NULL DEFAULT false,
    "showLastPmOutcome" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetQrSetting_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "CmWork" ADD CONSTRAINT "CmWork_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CmWork_assetId_idx" ON "CmWork"("assetId");

-- CreateIndex
CREATE INDEX "AssetSystem_plantId_active_idx" ON "AssetSystem"("plantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSystem_plantId_code_key" ON "AssetSystem"("plantId", "code");

-- CreateIndex
CREATE INDEX "AssetClass_plantId_active_idx" ON "AssetClass"("plantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AssetClass_plantId_nameTh_key" ON "AssetClass"("plantId", "nameTh");

-- CreateIndex
CREATE INDEX "AssetType_plantId_active_idx" ON "AssetType"("plantId", "active");

-- CreateIndex
CREATE INDEX "AssetType_assetClassId_idx" ON "AssetType"("assetClassId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetType_plantId_code_key" ON "AssetType"("plantId", "code");

-- CreateIndex
CREATE INDEX "AssetTechnicalField_assetTypeId_active_sortOrder_idx" ON "AssetTechnicalField"("assetTypeId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTechnicalField_assetTypeId_key_key" ON "AssetTechnicalField"("assetTypeId", "key");

-- CreateIndex
CREATE INDEX "AssetFamily_plantId_active_idx" ON "AssetFamily"("plantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AssetFamily_plantId_systemId_code_key" ON "AssetFamily"("plantId", "systemId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSequence_plantId_systemId_familyId_key" ON "AssetSequence"("plantId", "systemId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_publicToken_key" ON "Asset"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_code_key" ON "Asset"("code");

-- CreateIndex
CREATE INDEX "Asset_plantId_registrationStatus_idx" ON "Asset"("plantId", "registrationStatus");

-- CreateIndex
CREATE INDEX "Asset_systemId_familyId_idx" ON "Asset"("systemId", "familyId");

-- CreateIndex
CREATE INDEX "Asset_assetClassId_assetTypeId_idx" ON "Asset"("assetClassId", "assetTypeId");

-- CreateIndex
CREATE INDEX "Asset_zoneId_idx" ON "Asset"("zoneId");

-- CreateIndex
CREATE INDEX "Asset_parentId_idx" ON "Asset"("parentId");

-- CreateIndex
CREATE INDEX "Asset_serialNormalized_idx" ON "Asset"("serialNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_parentId_componentCode_key" ON "Asset"("parentId", "componentCode");

-- CreateIndex
CREATE INDEX "AssetTechnicalValue_assetId_sortOrder_idx" ON "AssetTechnicalValue"("assetId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTechnicalValue_assetId_fieldId_key" ON "AssetTechnicalValue"("assetId", "fieldId");

-- CreateIndex
CREATE INDEX "AssetDocument_assetId_category_status_idx" ON "AssetDocument"("assetId", "category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetQrSetting_plantId_key" ON "AssetQrSetting"("plantId");
