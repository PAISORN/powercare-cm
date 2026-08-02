-- System is represented by Zone and is intentionally excluded from Asset codes.
DROP INDEX IF EXISTS "Asset_systemId_familyId_idx";
DROP INDEX IF EXISTS "AssetFamily_plantId_systemId_code_key";
DROP INDEX IF EXISTS "AssetSequence_plantId_systemId_familyId_key";

ALTER TABLE "Asset" DROP COLUMN "systemId";
ALTER TABLE "AssetFamily" DROP COLUMN "systemId";
ALTER TABLE "AssetSequence" DROP COLUMN "systemId";

CREATE INDEX "Asset_familyId_idx" ON "Asset"("familyId");
CREATE UNIQUE INDEX "AssetFamily_plantId_code_key" ON "AssetFamily"("plantId", "code");
CREATE UNIQUE INDEX "AssetSequence_plantId_familyId_key" ON "AssetSequence"("plantId", "familyId");

DROP TABLE "AssetSystem";
