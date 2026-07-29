CREATE TABLE "SparePartMaterialGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartMaterialGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartMaterialGroup_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SparePartMaterialGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SparePartCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "SparePart" ADD COLUMN "materialGroupId" TEXT REFERENCES "SparePartMaterialGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SparePartMaterialGroup_categoryId_code_key" ON "SparePartMaterialGroup"("categoryId", "code");
CREATE UNIQUE INDEX "SparePartMaterialGroup_categoryId_name_key" ON "SparePartMaterialGroup"("categoryId", "name");
CREATE INDEX "SparePartMaterialGroup_organizationId_active_idx" ON "SparePartMaterialGroup"("organizationId", "active");
CREATE INDEX "SparePartMaterialGroup_plantId_active_idx" ON "SparePartMaterialGroup"("plantId", "active");
CREATE INDEX "SparePartMaterialGroup_categoryId_active_idx" ON "SparePartMaterialGroup"("categoryId", "active");
CREATE INDEX "SparePart_materialGroupId_active_idx" ON "SparePart"("materialGroupId", "active");
