ALTER TABLE "User" ADD COLUMN "lastSeenAt" DATETIME;

CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");
