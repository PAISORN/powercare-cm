CREATE TABLE IF NOT EXISTS "PlantProfile" (
  "id" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "companyName" TEXT,
  "address" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "notes" TEXT,
  "logoFileName" TEXT,
  "logoMimeType" TEXT,
  "logoFileSize" INTEGER,
  "logoStoragePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlantProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlantProfile_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlantProfile_plantId_key" ON "PlantProfile"("plantId");
