CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Plant" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Plant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
ALTER TABLE "CmWork" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "CmWork" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "LineDestination" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "OrganizationProfile" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "PublicFeedback" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "PublicFeedback" ADD COLUMN IF NOT EXISTS "plantId" TEXT;

INSERT INTO "Organization" ("id", "slug", "name", "active", "updatedAt")
VALUES ('primary', 'primary', 'Power Care.CM', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Plant" ("id", "organizationId", "code", "name", "active", "updatedAt")
VALUES ('primary-plant', 'primary', 'main', 'Main Plant', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "organizationId" = EXCLUDED."organizationId",
  "code" = EXCLUDED."code",
  "name" = EXCLUDED."name",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "User" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;
UPDATE "Category" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "Zone" SET "plantId" = 'primary-plant' WHERE "plantId" IS NULL;
UPDATE "CmWork" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;
UPDATE "Announcement" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "LineDestination" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "OrganizationProfile" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "PublicFeedback" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_active_idx" ON "Organization"("active");
CREATE UNIQUE INDEX IF NOT EXISTS "Plant_organizationId_code_key" ON "Plant"("organizationId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Plant_organizationId_name_key" ON "Plant"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "Plant_organizationId_active_idx" ON "Plant"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX IF NOT EXISTS "User_plantId_idx" ON "User"("plantId");
CREATE INDEX IF NOT EXISTS "Category_organizationId_active_idx" ON "Category"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "Zone_plantId_active_idx" ON "Zone"("plantId", "active");
CREATE INDEX IF NOT EXISTS "CmWork_organizationId_status_idx" ON "CmWork"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "CmWork_plantId_status_idx" ON "CmWork"("plantId", "status");
CREATE INDEX IF NOT EXISTS "Announcement_organizationId_active_idx" ON "Announcement"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "LineDestination_organizationId_active_idx" ON "LineDestination"("organizationId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationProfile_organizationId_key" ON "OrganizationProfile"("organizationId");
CREATE INDEX IF NOT EXISTS "PublicFeedback_organizationId_createdAt_idx" ON "PublicFeedback"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicFeedback_plantId_createdAt_idx" ON "PublicFeedback"("plantId", "createdAt");

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plant" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "Organization", "Plant" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Organization", "Plant" TO prisma;

DROP POLICY IF EXISTS "organization_prisma_server_access" ON "Organization";
CREATE POLICY "organization_prisma_server_access"
ON "Organization"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "plant_prisma_server_access" ON "Plant";
CREATE POLICY "plant_prisma_server_access"
ON "Plant"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
