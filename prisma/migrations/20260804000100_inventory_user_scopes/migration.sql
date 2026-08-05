ALTER TABLE "SparePartIssue" ADD COLUMN "itemKind" TEXT NOT NULL DEFAULT 'SPARE_PART';

UPDATE "SparePartIssue"
SET "itemKind" = COALESCE((
  SELECT "SparePart"."itemKind"
  FROM "SparePartIssueItem"
  JOIN "SparePart" ON "SparePart"."id" = "SparePartIssueItem"."sparePartId"
  WHERE "SparePartIssueItem"."issueId" = "SparePartIssue"."id"
  LIMIT 1
), 'SPARE_PART');

CREATE TABLE "UserInventoryScope" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "itemKind" TEXT NOT NULL,
  "responsibilityEnabled" BOOLEAN NOT NULL DEFAULT false,
  "approvalEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "UserInventoryScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "UserInventoryScope" ("id", "userId", "itemKind", "responsibilityEnabled", "approvalEnabled", "createdAt", "updatedAt")
SELECT 'inventory-scope-' || "User"."id" || '-' || kinds."itemKind", "User"."id", kinds."itemKind",
  CASE WHEN "User"."role" = 'STORE_OFFICER' THEN true ELSE false END,
  CASE WHEN "User"."role" = 'ENGINEER' THEN true ELSE false END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
CROSS JOIN (SELECT 'SPARE_PART' AS "itemKind" UNION ALL SELECT 'CHEMICAL' UNION ALL SELECT 'OIL') kinds
WHERE "User"."active" = true AND "User"."role" IN ('STORE_OFFICER', 'ENGINEER');

CREATE UNIQUE INDEX "UserInventoryScope_userId_itemKind_key" ON "UserInventoryScope"("userId", "itemKind");
CREATE INDEX "UserInventoryScope_itemKind_responsibilityEnabled_idx" ON "UserInventoryScope"("itemKind", "responsibilityEnabled");
CREATE INDEX "UserInventoryScope_itemKind_approvalEnabled_idx" ON "UserInventoryScope"("itemKind", "approvalEnabled");
CREATE INDEX "SparePartIssue_plantId_itemKind_status_idx" ON "SparePartIssue"("plantId", "itemKind", "status");
