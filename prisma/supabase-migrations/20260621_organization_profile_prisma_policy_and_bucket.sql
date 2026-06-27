GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "OrganizationProfile"
TO prisma;

DROP POLICY IF EXISTS "organization_profile_prisma_server_access"
ON "OrganizationProfile";

CREATE POLICY "organization_profile_prisma_server_access"
ON "OrganizationProfile"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'powercare-organization-logos',
  'powercare-organization-logos',
  false,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
