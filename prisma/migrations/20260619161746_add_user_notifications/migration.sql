-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "targetStatus" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "UserNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserNotification_recipientId_readAt_createdAt_idx" ON "UserNotification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_recipientId_targetStatus_readAt_idx" ON "UserNotification"("recipientId", "targetStatus", "readAt");

-- CreateIndex
CREATE INDEX "UserNotification_recipientId_entityType_entityId_readAt_idx" ON "UserNotification"("recipientId", "entityType", "entityId", "readAt");

-- CreateIndex
CREATE INDEX "UserNotification_entityType_entityId_idx" ON "UserNotification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "UserNotification_eventType_idx" ON "UserNotification"("eventType");
