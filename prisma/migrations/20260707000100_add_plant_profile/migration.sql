CREATE TABLE "PlantProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PlantProfile_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PlantProfile_plantId_key" ON "PlantProfile"("plantId");
