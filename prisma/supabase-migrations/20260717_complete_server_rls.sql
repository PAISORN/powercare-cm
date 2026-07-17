-- Complete server-only RLS coverage for tables introduced after the core policy migration.
ALTER TABLE "PublicFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlantProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SparePartType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteAdminPermission" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "PublicFeedback" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlantProfile" FROM anon, authenticated;
REVOKE ALL ON TABLE "SparePartType" FROM anon, authenticated;
REVOKE ALL ON TABLE "SiteAdminPermission" FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PublicFeedback" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PlantProfile" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SparePartType" TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SiteAdminPermission" TO prisma;

DROP POLICY IF EXISTS "public_feedback_prisma_server_access" ON "PublicFeedback";
CREATE POLICY "public_feedback_prisma_server_access"
ON "PublicFeedback" FOR ALL TO prisma
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "plant_profile_prisma_server_access" ON "PlantProfile";
CREATE POLICY "plant_profile_prisma_server_access"
ON "PlantProfile" FOR ALL TO prisma
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "spare_part_type_prisma_server_access" ON "SparePartType";
CREATE POLICY "spare_part_type_prisma_server_access"
ON "SparePartType" FOR ALL TO prisma
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "site_admin_permission_prisma_server_access" ON "SiteAdminPermission";
CREATE POLICY "site_admin_permission_prisma_server_access"
ON "SiteAdminPermission" FOR ALL TO prisma
USING (true) WITH CHECK (true);
