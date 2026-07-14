DROP INDEX IF EXISTS "Category_name_key";
DROP INDEX IF EXISTS "Zone_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Category_organizationId_name_key" ON "Category"("organizationId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Zone_plantId_name_key" ON "Zone"("plantId", "name");
