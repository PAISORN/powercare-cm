-- System is represented by Zone and is intentionally excluded from Asset codes.
DROP INDEX IF EXISTS "Asset_systemId_familyId_idx";
DROP INDEX IF EXISTS "AssetFamily_plantId_systemId_code_key";
DROP INDEX IF EXISTS "AssetSequence_plantId_systemId_familyId_key";

ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_systemId_fkey";
ALTER TABLE "AssetFamily" DROP CONSTRAINT IF EXISTS "AssetFamily_systemId_fkey";
ALTER TABLE "AssetSequence" DROP CONSTRAINT IF EXISTS "AssetSequence_systemId_fkey";

ALTER TABLE "Asset" DROP COLUMN "systemId";
ALTER TABLE "AssetFamily" DROP COLUMN "systemId";
ALTER TABLE "AssetSequence" DROP COLUMN "systemId";

CREATE INDEX "Asset_familyId_idx" ON "Asset"("familyId");
CREATE UNIQUE INDEX "AssetFamily_plantId_code_key" ON "AssetFamily"("plantId", "code");
CREATE UNIQUE INDEX "AssetSequence_plantId_familyId_key" ON "AssetSequence"("plantId", "familyId");

DROP TABLE "AssetSystem";

-- Asset data is accessed through the application server. Keep browser roles blocked.
ALTER TABLE "AssetClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetTechnicalField" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetFamily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetTechnicalValue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetQrSetting" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AssetClass" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssetType" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssetTechnicalField" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssetFamily" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssetSequence" FROM anon, authenticated;
REVOKE ALL ON TABLE "Asset" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssetTechnicalValue" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssetDocument" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssetQrSetting" FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetClass" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetType" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetTechnicalField" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetFamily" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetSequence" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Asset" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetTechnicalValue" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetDocument" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AssetQrSetting" TO prisma;

CREATE POLICY "asset_class_prisma_server_access" ON "AssetClass" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_type_prisma_server_access" ON "AssetType" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_technical_field_prisma_server_access" ON "AssetTechnicalField" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_family_prisma_server_access" ON "AssetFamily" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_sequence_prisma_server_access" ON "AssetSequence" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_prisma_server_access" ON "Asset" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_technical_value_prisma_server_access" ON "AssetTechnicalValue" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_document_prisma_server_access" ON "AssetDocument" FOR ALL TO prisma USING (true) WITH CHECK (true);
CREATE POLICY "asset_qr_setting_prisma_server_access" ON "AssetQrSetting" FOR ALL TO prisma USING (true) WITH CHECK (true);
