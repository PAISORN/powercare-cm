CREATE TABLE "LineDestination" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "categoryId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LineDestination_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LineDestination_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "LineEventSetting" (
  "id" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "LineEventSetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LineEventSetting_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "LineDestination"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LineDeliveryLog" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LineDeliveryLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LineDeliveryLog_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "LineDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LineDestination_targetId_key" ON "LineDestination"("targetId");
CREATE INDEX "LineDestination_categoryId_active_idx" ON "LineDestination"("categoryId", "active");
CREATE UNIQUE INDEX "LineEventSetting_destinationId_eventType_key" ON "LineEventSetting"("destinationId", "eventType");
CREATE UNIQUE INDEX "LineDeliveryLog_eventId_destinationId_key" ON "LineDeliveryLog"("eventId", "destinationId");
CREATE INDEX "LineDeliveryLog_status_createdAt_idx" ON "LineDeliveryLog"("status", "createdAt");

ALTER TABLE "LineDestination" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineEventSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineDeliveryLog" ENABLE ROW LEVEL SECURITY;
