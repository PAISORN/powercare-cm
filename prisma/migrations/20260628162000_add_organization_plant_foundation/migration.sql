CREATE TABLE "Organization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Plant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Plant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "Organization" ("id", "slug", "name", "active", "updatedAt")
VALUES ('primary', 'primary', 'Power Care.CM', true, CURRENT_TIMESTAMP);

INSERT INTO "Plant" ("id", "organizationId", "code", "name", "active", "updatedAt")
VALUES ('primary-plant', 'primary', 'main', 'Main Plant', true, CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN "plantId" TEXT;
ALTER TABLE "Category" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Zone" ADD COLUMN "plantId" TEXT;
ALTER TABLE "CmWork" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "CmWork" ADD COLUMN "plantId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "LineDestination" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "OrganizationProfile" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "PublicFeedback" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "PublicFeedback" ADD COLUMN "plantId" TEXT;

UPDATE "User" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;
UPDATE "Category" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "Zone" SET "plantId" = 'primary-plant' WHERE "plantId" IS NULL;
UPDATE "CmWork" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;
UPDATE "Announcement" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "LineDestination" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "OrganizationProfile" SET "organizationId" = 'primary' WHERE "organizationId" IS NULL;
UPDATE "PublicFeedback" SET "organizationId" = 'primary', "plantId" = 'primary-plant' WHERE "organizationId" IS NULL;

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_active_idx" ON "Organization"("active");
CREATE UNIQUE INDEX "Plant_organizationId_code_key" ON "Plant"("organizationId", "code");
CREATE UNIQUE INDEX "Plant_organizationId_name_key" ON "Plant"("organizationId", "name");
CREATE INDEX "Plant_organizationId_active_idx" ON "Plant"("organizationId", "active");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_plantId_idx" ON "User"("plantId");
CREATE INDEX "Category_organizationId_active_idx" ON "Category"("organizationId", "active");
CREATE INDEX "Zone_plantId_active_idx" ON "Zone"("plantId", "active");
CREATE INDEX "CmWork_organizationId_status_idx" ON "CmWork"("organizationId", "status");
CREATE INDEX "CmWork_plantId_status_idx" ON "CmWork"("plantId", "status");
CREATE INDEX "Announcement_organizationId_active_idx" ON "Announcement"("organizationId", "active");
CREATE INDEX "LineDestination_organizationId_active_idx" ON "LineDestination"("organizationId", "active");
CREATE UNIQUE INDEX "OrganizationProfile_organizationId_key" ON "OrganizationProfile"("organizationId");
CREATE INDEX "PublicFeedback_organizationId_createdAt_idx" ON "PublicFeedback"("organizationId", "createdAt");
CREATE INDEX "PublicFeedback_plantId_createdAt_idx" ON "PublicFeedback"("plantId", "createdAt");
