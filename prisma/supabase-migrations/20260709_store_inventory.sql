ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "inventoryCode" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "publicStoreIssueEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "publicStoreIssueContactRequired" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Plant_inventoryCode_key" ON "Plant"("inventoryCode");

CREATE TABLE IF NOT EXISTS "StoreCategory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StoreCategory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Store" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "categoryId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Store_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Store_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Store_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StoreCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartCategory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SparePartCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SparePartCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SparePartCategory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePart" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "categoryId" TEXT,
  "code" TEXT NOT NULL,
  "itemCode" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL,
  "latestUnitPrice" DECIMAL(65,30),
  "minStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SparePart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SparePart_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SparePartCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartApplicableZone" (
  "id" TEXT NOT NULL,
  "sparePartId" TEXT NOT NULL,
  "zoneId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SparePartApplicableZone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SparePartApplicableZone_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SparePartApplicableZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartSequence" (
  "plantId" TEXT NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SparePartSequence_pkey" PRIMARY KEY ("plantId"),
  CONSTRAINT "SparePartSequence_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoreIssueSequence" (
  "id" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreIssueSequence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreIssueSequence_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoreStock" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "sparePartId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreStock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreStock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StoreStock_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StoreStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StoreStock_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartReceive" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "receivedById" TEXT,
  "supplierName" TEXT,
  "referenceNo" TEXT,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SparePartReceive_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SparePartReceive_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SparePartReceive_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SparePartReceive_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartReceiveItem" (
  "id" TEXT NOT NULL,
  "receiveId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "sparePartId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "unitPrice" DECIMAL(65,30),
  "note" TEXT,
  CONSTRAINT "SparePartReceiveItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SparePartReceiveItem_receiveId_fkey" FOREIGN KEY ("receiveId") REFERENCES "SparePartReceive"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SparePartReceiveItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SparePartReceiveItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartIssue" (
  "id" TEXT NOT NULL,
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
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "engineerApprovedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SparePartIssue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SparePartIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SparePartIssue_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SparePartIssue_cmWorkId_fkey" FOREIGN KEY ("cmWorkId") REFERENCES "CmWork"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SparePartIssue_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SparePartIssue_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SparePartIssue_storeOfficerId_fkey" FOREIGN KEY ("storeOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SparePartIssueItem" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "storeId" TEXT,
  "sparePartId" TEXT NOT NULL,
  "requestedQty" DECIMAL(65,30) NOT NULL,
  "approvedQty" DECIMAL(65,30),
  "issuedQty" DECIMAL(65,30),
  "unitPrice" DECIMAL(65,30),
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "note" TEXT,
  CONSTRAINT "SparePartIssueItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SparePartIssueItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "SparePartIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SparePartIssueItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SparePartIssueItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "sparePartId" TEXT NOT NULL,
  "actorId" TEXT,
  "movementType" TEXT NOT NULL,
  "refType" TEXT,
  "refId" TEXT,
  "quantityChange" DECIMAL(65,30) NOT NULL,
  "balanceAfter" DECIMAL(65,30),
  "unitPrice" DECIMAL(65,30),
  "note" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoreCategory_plantId_name_key" ON "StoreCategory"("plantId", "name");
CREATE INDEX IF NOT EXISTS "StoreCategory_organizationId_active_idx" ON "StoreCategory"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "StoreCategory_plantId_active_idx" ON "StoreCategory"("plantId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "Store_plantId_code_key" ON "Store"("plantId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Store_plantId_name_key" ON "Store"("plantId", "name");
CREATE INDEX IF NOT EXISTS "Store_organizationId_active_idx" ON "Store"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "Store_plantId_active_idx" ON "Store"("plantId", "active");
CREATE INDEX IF NOT EXISTS "Store_categoryId_idx" ON "Store"("categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartCategory_plantId_name_key" ON "SparePartCategory"("plantId", "name");
CREATE INDEX IF NOT EXISTS "SparePartCategory_organizationId_active_idx" ON "SparePartCategory"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "SparePartCategory_plantId_active_idx" ON "SparePartCategory"("plantId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePart_plantId_code_key" ON "SparePart"("plantId", "code");
CREATE INDEX IF NOT EXISTS "SparePart_organizationId_active_idx" ON "SparePart"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "SparePart_plantId_active_idx" ON "SparePart"("plantId", "active");
CREATE INDEX IF NOT EXISTS "SparePart_plantId_itemCode_idx" ON "SparePart"("plantId", "itemCode");
CREATE INDEX IF NOT EXISTS "SparePart_categoryId_active_idx" ON "SparePart"("categoryId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartApplicableZone_sparePartId_zoneId_key" ON "SparePartApplicableZone"("sparePartId", "zoneId");
CREATE INDEX IF NOT EXISTS "SparePartApplicableZone_zoneId_idx" ON "SparePartApplicableZone"("zoneId");
CREATE UNIQUE INDEX IF NOT EXISTS "StoreIssueSequence_plantId_year_month_key" ON "StoreIssueSequence"("plantId", "year", "month");
CREATE INDEX IF NOT EXISTS "StoreIssueSequence_plantId_idx" ON "StoreIssueSequence"("plantId");
CREATE UNIQUE INDEX IF NOT EXISTS "StoreStock_storeId_sparePartId_key" ON "StoreStock"("storeId", "sparePartId");
CREATE INDEX IF NOT EXISTS "StoreStock_organizationId_idx" ON "StoreStock"("organizationId");
CREATE INDEX IF NOT EXISTS "StoreStock_plantId_idx" ON "StoreStock"("plantId");
CREATE INDEX IF NOT EXISTS "StoreStock_sparePartId_idx" ON "StoreStock"("sparePartId");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartReceive_number_key" ON "SparePartReceive"("number");
CREATE INDEX IF NOT EXISTS "SparePartReceive_organizationId_receivedAt_idx" ON "SparePartReceive"("organizationId", "receivedAt");
CREATE INDEX IF NOT EXISTS "SparePartReceive_plantId_receivedAt_idx" ON "SparePartReceive"("plantId", "receivedAt");
CREATE INDEX IF NOT EXISTS "SparePartReceive_receivedById_idx" ON "SparePartReceive"("receivedById");
CREATE INDEX IF NOT EXISTS "SparePartReceiveItem_storeId_idx" ON "SparePartReceiveItem"("storeId");
CREATE INDEX IF NOT EXISTS "SparePartReceiveItem_sparePartId_idx" ON "SparePartReceiveItem"("sparePartId");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartIssue_number_key" ON "SparePartIssue"("number");
CREATE INDEX IF NOT EXISTS "SparePartIssue_organizationId_requestedAt_idx" ON "SparePartIssue"("organizationId", "requestedAt");
CREATE INDEX IF NOT EXISTS "SparePartIssue_plantId_requestedAt_idx" ON "SparePartIssue"("plantId", "requestedAt");
CREATE INDEX IF NOT EXISTS "SparePartIssue_cmWorkId_idx" ON "SparePartIssue"("cmWorkId");
CREATE INDEX IF NOT EXISTS "SparePartIssue_status_requestedAt_idx" ON "SparePartIssue"("status", "requestedAt");
CREATE INDEX IF NOT EXISTS "SparePartIssue_requesterUserId_idx" ON "SparePartIssue"("requesterUserId");
CREATE INDEX IF NOT EXISTS "SparePartIssue_engineerId_idx" ON "SparePartIssue"("engineerId");
CREATE INDEX IF NOT EXISTS "SparePartIssue_storeOfficerId_idx" ON "SparePartIssue"("storeOfficerId");
CREATE INDEX IF NOT EXISTS "SparePartIssueItem_storeId_idx" ON "SparePartIssueItem"("storeId");
CREATE INDEX IF NOT EXISTS "SparePartIssueItem_sparePartId_idx" ON "SparePartIssueItem"("sparePartId");
CREATE INDEX IF NOT EXISTS "SparePartIssueItem_status_idx" ON "SparePartIssueItem"("status");
CREATE INDEX IF NOT EXISTS "StockMovement_organizationId_occurredAt_idx" ON "StockMovement"("organizationId", "occurredAt");
CREATE INDEX IF NOT EXISTS "StockMovement_plantId_occurredAt_idx" ON "StockMovement"("plantId", "occurredAt");
CREATE INDEX IF NOT EXISTS "StockMovement_storeId_occurredAt_idx" ON "StockMovement"("storeId", "occurredAt");
CREATE INDEX IF NOT EXISTS "StockMovement_sparePartId_occurredAt_idx" ON "StockMovement"("sparePartId", "occurredAt");
CREATE INDEX IF NOT EXISTS "StockMovement_movementType_occurredAt_idx" ON "StockMovement"("movementType", "occurredAt");
CREATE INDEX IF NOT EXISTS "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

ALTER TABLE "StoreCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartApplicableZone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreIssueSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartReceive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartReceiveItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartIssueItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "StoreCategory", "Store", "SparePartCategory", "SparePart", "SparePartApplicableZone",
  "SparePartSequence", "StoreIssueSequence", "StoreStock", "SparePartReceive", "SparePartReceiveItem",
  "SparePartIssue", "SparePartIssueItem", "StockMovement"
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "StoreCategory", "Store", "SparePartCategory", "SparePart", "SparePartApplicableZone",
  "SparePartSequence", "StoreIssueSequence", "StoreStock", "SparePartReceive", "SparePartReceiveItem",
  "SparePartIssue", "SparePartIssueItem", "StockMovement"
TO prisma;

DO $$
DECLARE
  table_name TEXT;
  policy_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'StoreCategory', 'Store', 'SparePartCategory', 'SparePart', 'SparePartApplicableZone',
    'SparePartSequence', 'StoreIssueSequence', 'StoreStock', 'SparePartReceive', 'SparePartReceiveItem',
    'SparePartIssue', 'SparePartIssueItem', 'StockMovement'
  ]
  LOOP
    policy_name := lower(regexp_replace(table_name, '([a-z0-9])([A-Z])', '\1_\2', 'g')) || '_prisma_server_access';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO prisma USING (true) WITH CHECK (true)',
      policy_name,
      table_name
    );
  END LOOP;
END
$$;
