CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "imageFileName" TEXT,
  "imageMimeType" TEXT,
  "imageFileSize" INTEGER,
  "imageStoragePath" TEXT,
  "publishStart" TIMESTAMP(3) NOT NULL,
  "publishEnd" TIMESTAMP(3) NOT NULL,
  "pinned" BOOLEAN NOT NULL DEFAULT FALSE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Announcement_active_publishStart_publishEnd_idx" ON "Announcement"("active", "publishStart", "publishEnd");
CREATE INDEX IF NOT EXISTS "Announcement_pinned_publishStart_idx" ON "Announcement"("pinned", "publishStart");
CREATE INDEX IF NOT EXISTS "Announcement_authorId_idx" ON "Announcement"("authorId");

ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Announcement" FROM anon, authenticated;
