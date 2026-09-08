-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_familyId_fkey";

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_assetClassId_fkey";

-- AlterTable
ALTER TABLE "AssetType" ADD COLUMN     "defaultLevel" TEXT,
ADD COLUMN     "discipline" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "assetLevel" TEXT NOT NULL DEFAULT 'MAIN_ASSET',
ADD COLUMN     "discipline" TEXT,
ADD COLUMN     "keySpecification" TEXT,
ADD COLUMN     "metadataJson" TEXT,
ADD COLUMN     "migrationStatus" TEXT NOT NULL DEFAULT 'NEED_REVIEW',
ADD COLUMN     "registrationCode" TEXT,
ADD COLUMN     "systemId" TEXT,
ADD COLUMN     "tagKks" TEXT,
ALTER COLUMN "familyId" DROP NOT NULL,
ALTER COLUMN "assetClassId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AssetCodeSequence" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCodeSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetCodeSequence_plantId_typeCode_key" ON "AssetCodeSequence"("plantId", "typeCode");
CREATE INDEX "AssetCodeSequence_plantId_idx" ON "AssetCodeSequence"("plantId");
ALTER TABLE "AssetCodeSequence" ADD CONSTRAINT "AssetCodeSequence_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- CreateTable
CREATE TABLE "AssetSystem" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetSystem_plantId_active_sortOrder_idx" ON "AssetSystem"("plantId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSystem_plantId_code_key" ON "AssetSystem"("plantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSystem_id_plantId_key" ON "AssetSystem"("id", "plantId");

-- CreateIndex
CREATE INDEX "Asset_systemId_idx" ON "Asset"("systemId");

-- CreateIndex
CREATE INDEX "Asset_tagKks_idx" ON "Asset"("tagKks");

-- CreateIndex
CREATE INDEX "Asset_plantId_assetLevel_idx" ON "Asset"("plantId", "assetLevel");

-- CreateIndex
CREATE INDEX "Asset_plantId_migrationStatus_idx" ON "Asset"("plantId", "migrationStatus");

-- AddForeignKey
ALTER TABLE "AssetSystem" ADD CONSTRAINT "AssetSystem_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_systemId_plantId_fkey" FOREIGN KEY ("systemId", "plantId") REFERENCES "AssetSystem"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentId_plantId_fkey" FOREIGN KEY ("parentId", "plantId") REFERENCES "Asset"("id", "plantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "AssetFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assetClassId_fkey" FOREIGN KEY ("assetClassId") REFERENCES "AssetClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assetLevel_check" CHECK ("assetLevel" IN ('MAIN_ASSET', 'SUB_ASSET', 'PART'));
ALTER TABLE "AssetSystem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetCodeSequence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AssetSystem", "AssetCodeSequence" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetSystem", "AssetCodeSequence" TO prisma;
CREATE POLICY "asset_system_prisma_server_access" ON "AssetSystem" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_code_sequence_prisma_server_access" ON "AssetCodeSequence" FOR ALL TO prisma USING (true) WITH CHECK (true);
