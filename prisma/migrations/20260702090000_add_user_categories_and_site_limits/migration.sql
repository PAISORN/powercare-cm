ALTER TABLE "Plant" ADD COLUMN "maxUsers" INTEGER;
ALTER TABLE "Plant" ADD COLUMN "maxWorkRequests" INTEGER;

CREATE TABLE "UserCategory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserCategory_userId_categoryId_key" ON "UserCategory"("userId", "categoryId");
CREATE INDEX "UserCategory_categoryId_idx" ON "UserCategory"("categoryId");

INSERT INTO "UserCategory" ("id", "userId", "categoryId", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "categoryId", CURRENT_TIMESTAMP
FROM "User"
WHERE "categoryId" IS NOT NULL;
