-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageFileName" TEXT,
    "imageMimeType" TEXT,
    "imageFileSize" INTEGER,
    "imageStoragePath" TEXT,
    "publishStart" DATETIME NOT NULL,
    "publishEnd" DATETIME NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Announcement_active_publishStart_publishEnd_idx" ON "Announcement"("active", "publishStart", "publishEnd");

-- CreateIndex
CREATE INDEX "Announcement_pinned_publishStart_idx" ON "Announcement"("pinned", "publishStart");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");
