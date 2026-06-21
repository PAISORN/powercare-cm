CREATE TABLE "OrganizationProfile" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "logoFileName" TEXT,
  "logoMimeType" TEXT,
  "logoFileSize" INTEGER,
  "logoStoragePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrganizationProfile" ENABLE ROW LEVEL SECURITY;
