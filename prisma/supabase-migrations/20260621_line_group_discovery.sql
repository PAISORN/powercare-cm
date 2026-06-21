CREATE TABLE "LineGroupDiscovery" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "displayName" TEXT,
  "eventType" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "addedDestinationId" TEXT,
  CONSTRAINT "LineGroupDiscovery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LineGroupDiscovery_addedDestinationId_fkey" FOREIGN KEY ("addedDestinationId") REFERENCES "LineDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LineGroupDiscovery_groupId_key" ON "LineGroupDiscovery"("groupId");
CREATE UNIQUE INDEX "LineGroupDiscovery_addedDestinationId_key" ON "LineGroupDiscovery"("addedDestinationId");
CREATE INDEX "LineGroupDiscovery_lastSeenAt_idx" ON "LineGroupDiscovery"("lastSeenAt");

ALTER TABLE "LineGroupDiscovery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LineGroupDiscovery" FROM anon, authenticated;
