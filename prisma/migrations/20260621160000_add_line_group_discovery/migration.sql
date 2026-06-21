-- CreateTable
CREATE TABLE "LineGroupDiscovery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "displayName" TEXT,
    "eventType" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedDestinationId" TEXT,
    CONSTRAINT "LineGroupDiscovery_addedDestinationId_fkey" FOREIGN KEY ("addedDestinationId") REFERENCES "LineDestination" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LineGroupDiscovery_groupId_key" ON "LineGroupDiscovery"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "LineGroupDiscovery_addedDestinationId_key" ON "LineGroupDiscovery"("addedDestinationId");

-- CreateIndex
CREATE INDEX "LineGroupDiscovery_lastSeenAt_idx" ON "LineGroupDiscovery"("lastSeenAt");
