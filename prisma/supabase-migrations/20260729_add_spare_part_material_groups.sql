CREATE TABLE IF NOT EXISTS "SparePartMaterialGroup" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "plantId" TEXT NOT NULL REFERENCES "Plant"("id") ON DELETE CASCADE,
  "categoryId" TEXT NOT NULL REFERENCES "SparePartCategory"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "materialGroupId" TEXT;
ALTER TABLE "SparePart" DROP CONSTRAINT IF EXISTS "SparePart_materialGroupId_fkey";
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_materialGroupId_fkey"
  FOREIGN KEY ("materialGroupId") REFERENCES "SparePartMaterialGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "SparePartMaterialGroup_categoryId_code_key" ON "SparePartMaterialGroup"("categoryId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "SparePartMaterialGroup_categoryId_name_key" ON "SparePartMaterialGroup"("categoryId", "name");
CREATE INDEX IF NOT EXISTS "SparePartMaterialGroup_organizationId_active_idx" ON "SparePartMaterialGroup"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "SparePartMaterialGroup_plantId_active_idx" ON "SparePartMaterialGroup"("plantId", "active");
CREATE INDEX IF NOT EXISTS "SparePartMaterialGroup_categoryId_active_idx" ON "SparePartMaterialGroup"("categoryId", "active");
CREATE INDEX IF NOT EXISTS "SparePart_materialGroupId_active_idx" ON "SparePart"("materialGroupId", "active");

ALTER TABLE "SparePartMaterialGroup" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spare_part_material_group_prisma_server_access" ON "SparePartMaterialGroup";
CREATE POLICY "spare_part_material_group_prisma_server_access"
  ON "SparePartMaterialGroup" FOR ALL TO prisma USING (true) WITH CHECK (true);
