-- CreateTable
CREATE TABLE "StoreCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StoreCategory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Store_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Store_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StoreCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartCategory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "code" TEXT NOT NULL,
    "itemCode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "latestUnitPrice" DECIMAL,
    "minStock" DECIMAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePart_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SparePartCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartApplicableZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sparePartId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SparePartApplicableZone_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SparePartApplicableZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartSequence" (
    "plantId" TEXT NOT NULL PRIMARY KEY,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartSequence_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreIssueSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreIssueSequence_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreStock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StoreStock_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoreStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoreStock_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "actorId" TEXT,
    "movementType" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "quantityChange" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL,
    "unitPrice" DECIMAL,
    "note" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartReceive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "receivedById" TEXT,
    "supplierName" TEXT,
    "referenceNo" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartReceive_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartReceive_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SparePartReceive_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartReceiveItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiveId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitPrice" DECIMAL,
    "note" TEXT,
    CONSTRAINT "SparePartReceiveItem_receiveId_fkey" FOREIGN KEY ("receiveId") REFERENCES "SparePartReceive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SparePartReceiveItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartReceiveItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "cmWorkId" TEXT,
    "issueType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING_ENGINEER_APPROVAL',
    "requesterName" TEXT NOT NULL,
    "requesterContact" TEXT,
    "requesterUserId" TEXT,
    "engineerId" TEXT,
    "storeOfficerId" TEXT,
    "note" TEXT,
    "rejectReason" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "engineerApprovedAt" DATETIME,
    "issuedAt" DATETIME,
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartIssue_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SparePartIssue_cmWorkId_fkey" FOREIGN KEY ("cmWorkId") REFERENCES "CmWork" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SparePartIssue_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SparePartIssue_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SparePartIssue_storeOfficerId_fkey" FOREIGN KEY ("storeOfficerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartIssueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "storeId" TEXT,
    "sparePartId" TEXT NOT NULL,
    "requestedQty" DECIMAL NOT NULL,
    "approvedQty" DECIMAL,
    "issuedQty" DECIMAL,
    "unitPrice" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    CONSTRAINT "SparePartIssueItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "SparePartIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SparePartIssueItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SparePartIssueItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StoreCategory_organizationId_active_idx" ON "StoreCategory"("organizationId", "active");

-- CreateIndex
CREATE INDEX "StoreCategory_plantId_active_idx" ON "StoreCategory"("plantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCategory_plantId_name_key" ON "StoreCategory"("plantId", "name");

-- CreateIndex
CREATE INDEX "Store_organizationId_active_idx" ON "Store"("organizationId", "active");

-- CreateIndex
CREATE INDEX "Store_plantId_active_idx" ON "Store"("plantId", "active");

-- CreateIndex
CREATE INDEX "Store_categoryId_idx" ON "Store"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_plantId_code_key" ON "Store"("plantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Store_plantId_name_key" ON "Store"("plantId", "name");

-- CreateIndex
CREATE INDEX "SparePartCategory_organizationId_active_idx" ON "SparePartCategory"("organizationId", "active");

-- CreateIndex
CREATE INDEX "SparePartCategory_plantId_active_idx" ON "SparePartCategory"("plantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartCategory_plantId_name_key" ON "SparePartCategory"("plantId", "name");

-- CreateIndex
CREATE INDEX "SparePart_organizationId_active_idx" ON "SparePart"("organizationId", "active");

-- CreateIndex
CREATE INDEX "SparePart_plantId_active_idx" ON "SparePart"("plantId", "active");

-- CreateIndex
CREATE INDEX "SparePart_plantId_itemCode_idx" ON "SparePart"("plantId", "itemCode");

-- CreateIndex
CREATE INDEX "SparePart_categoryId_active_idx" ON "SparePart"("categoryId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_plantId_code_key" ON "SparePart"("plantId", "code");

-- CreateIndex
CREATE INDEX "SparePartApplicableZone_zoneId_idx" ON "SparePartApplicableZone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartApplicableZone_sparePartId_zoneId_key" ON "SparePartApplicableZone"("sparePartId", "zoneId");

-- CreateIndex
CREATE INDEX "StoreStock_organizationId_idx" ON "StoreStock"("organizationId");

-- CreateIndex
CREATE INDEX "StoreStock_plantId_idx" ON "StoreStock"("plantId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreIssueSequence_plantId_year_month_key" ON "StoreIssueSequence"("plantId", "year", "month");

-- CreateIndex
CREATE INDEX "StoreIssueSequence_plantId_idx" ON "StoreIssueSequence"("plantId");

-- CreateIndex
CREATE INDEX "StoreStock_sparePartId_idx" ON "StoreStock"("sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreStock_storeId_sparePartId_key" ON "StoreStock"("storeId", "sparePartId");

-- CreateIndex
CREATE INDEX "StockMovement_organizationId_occurredAt_idx" ON "StockMovement"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_plantId_occurredAt_idx" ON "StockMovement"("plantId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_storeId_occurredAt_idx" ON "StockMovement"("storeId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_sparePartId_occurredAt_idx" ON "StockMovement"("sparePartId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_movementType_occurredAt_idx" ON "StockMovement"("movementType", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartReceive_number_key" ON "SparePartReceive"("number");

-- CreateIndex
CREATE INDEX "SparePartReceive_organizationId_receivedAt_idx" ON "SparePartReceive"("organizationId", "receivedAt");

-- CreateIndex
CREATE INDEX "SparePartReceive_plantId_receivedAt_idx" ON "SparePartReceive"("plantId", "receivedAt");

-- CreateIndex
CREATE INDEX "SparePartReceive_receivedById_idx" ON "SparePartReceive"("receivedById");

-- CreateIndex
CREATE INDEX "SparePartReceiveItem_storeId_idx" ON "SparePartReceiveItem"("storeId");

-- CreateIndex
CREATE INDEX "SparePartReceiveItem_sparePartId_idx" ON "SparePartReceiveItem"("sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartIssue_number_key" ON "SparePartIssue"("number");

-- CreateIndex
CREATE INDEX "SparePartIssue_organizationId_requestedAt_idx" ON "SparePartIssue"("organizationId", "requestedAt");

-- CreateIndex
CREATE INDEX "SparePartIssue_plantId_requestedAt_idx" ON "SparePartIssue"("plantId", "requestedAt");

-- CreateIndex
CREATE INDEX "SparePartIssue_cmWorkId_idx" ON "SparePartIssue"("cmWorkId");

-- CreateIndex
CREATE INDEX "SparePartIssue_status_requestedAt_idx" ON "SparePartIssue"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "SparePartIssue_requesterUserId_idx" ON "SparePartIssue"("requesterUserId");

-- CreateIndex
CREATE INDEX "SparePartIssue_engineerId_idx" ON "SparePartIssue"("engineerId");

-- CreateIndex
CREATE INDEX "SparePartIssue_storeOfficerId_idx" ON "SparePartIssue"("storeOfficerId");

-- CreateIndex
CREATE INDEX "SparePartIssueItem_storeId_idx" ON "SparePartIssueItem"("storeId");

-- CreateIndex
CREATE INDEX "SparePartIssueItem_sparePartId_idx" ON "SparePartIssueItem"("sparePartId");

-- CreateIndex
CREATE INDEX "SparePartIssueItem_status_idx" ON "SparePartIssueItem"("status");
-- Add a dedicated three-character Store code without changing the public Site URL code.
ALTER TABLE "Plant" ADD COLUMN "inventoryCode" TEXT;
ALTER TABLE "Plant" ADD COLUMN "publicStoreIssueEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plant" ADD COLUMN "publicStoreIssueContactRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Plant_inventoryCode_key" ON "Plant"("inventoryCode");
