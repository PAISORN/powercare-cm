-- CreateTable
CREATE TABLE "AssetSystem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetSystem_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "updatedAt" DATETIME NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "documentDate" DATETIME,
    "note" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publicVisible" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "canceledReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetQrSetting_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CmWork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "submissionKey" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterDepartment" TEXT NOT NULL,
    "organizationId" TEXT,
    "plantId" TEXT,
    "categoryId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "assetId" TEXT,
    "assetCodeSnapshot" TEXT,
    "assetNameSnapshot" TEXT,
    "problemTitle" TEXT NOT NULL,
    "problemDetail" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "claimantId" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "workNote" TEXT,
    "engineerNote" TEXT,
    "canceledReason" TEXT,
    "releaseReason" TEXT,
    "returnedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" DATETIME,
    "inProgressAt" DATETIME,
    "waitingToCloseAt" DATETIME,
    "closedAt" DATETIME,
    "canceledAt" DATETIME,
    "reviewerId" TEXT,
    CONSTRAINT "CmWork_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CmWork_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CmWork_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CmWork_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CmWork_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CmWork_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CmWork_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CmWork" ("canceledAt", "canceledReason", "categoryId", "claimantId", "claimedAt", "closedAt", "correctiveAction", "createdAt", "engineerNote", "id", "inProgressAt", "machineName", "number", "organizationId", "plantId", "problemDetail", "problemTitle", "releaseReason", "requesterDepartment", "requesterName", "returnedReason", "reviewerId", "rootCause", "status", "submissionKey", "urgency", "waitingToCloseAt", "workNote", "zoneId") SELECT "canceledAt", "canceledReason", "categoryId", "claimantId", "claimedAt", "closedAt", "correctiveAction", "createdAt", "engineerNote", "id", "inProgressAt", "machineName", "number", "organizationId", "plantId", "problemDetail", "problemTitle", "releaseReason", "requesterDepartment", "requesterName", "returnedReason", "reviewerId", "rootCause", "status", "submissionKey", "urgency", "waitingToCloseAt", "workNote", "zoneId" FROM "CmWork";
DROP TABLE "CmWork";
ALTER TABLE "new_CmWork" RENAME TO "CmWork";
CREATE UNIQUE INDEX "CmWork_number_key" ON "CmWork"("number");
CREATE UNIQUE INDEX "CmWork_submissionKey_key" ON "CmWork"("submissionKey");
CREATE INDEX "CmWork_assetId_idx" ON "CmWork"("assetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
