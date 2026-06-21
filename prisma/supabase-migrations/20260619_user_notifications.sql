CREATE TABLE IF NOT EXISTS "UserNotification" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "targetStatus" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UserNotification_recipientId_readAt_createdAt_idx" ON "UserNotification"("recipientId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "UserNotification_recipientId_targetStatus_readAt_idx" ON "UserNotification"("recipientId", "targetStatus", "readAt");
CREATE INDEX IF NOT EXISTS "UserNotification_recipientId_entityType_entityId_readAt_idx" ON "UserNotification"("recipientId", "entityType", "entityId", "readAt");
CREATE INDEX IF NOT EXISTS "UserNotification_entityType_entityId_idx" ON "UserNotification"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "UserNotification_eventType_idx" ON "UserNotification"("eventType");
ALTER TABLE "UserNotification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserNotification" FROM anon, authenticated;
