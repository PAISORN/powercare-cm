-- Inventory responsibility and approval scopes per user.
-- Review and back up Production before applying this migration.

ALTER TABLE "SparePartIssue"
ADD COLUMN IF NOT EXISTS "itemKind" TEXT NOT NULL DEFAULT 'SPARE_PART';

UPDATE "SparePartIssue" AS issue
SET "itemKind" = COALESCE((
  SELECT part."itemKind"
  FROM "SparePartIssueItem" AS item
  JOIN "SparePart" AS part ON part."id" = item."sparePartId"
  WHERE item."issueId" = issue."id"
  ORDER BY item."id"
  LIMIT 1
), 'SPARE_PART');

CREATE TABLE IF NOT EXISTS "UserInventoryScope" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "itemKind" TEXT NOT NULL,
  "responsibilityEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "approvalEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInventoryScope_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserInventoryScope_userId_itemKind_key"
ON "UserInventoryScope"("userId", "itemKind");

CREATE INDEX IF NOT EXISTS "UserInventoryScope_itemKind_responsibilityEnabled_idx"
ON "UserInventoryScope"("itemKind", "responsibilityEnabled");

CREATE INDEX IF NOT EXISTS "UserInventoryScope_itemKind_approvalEnabled_idx"
ON "UserInventoryScope"("itemKind", "approvalEnabled");

CREATE INDEX IF NOT EXISTS "SparePartIssue_plantId_itemKind_status_idx"
ON "SparePartIssue"("plantId", "itemKind", "status");

-- Preserve current behavior for existing active Store Officers and Engineers.
INSERT INTO "UserInventoryScope" (
  "id",
  "userId",
  "itemKind",
  "responsibilityEnabled",
  "approvalEnabled",
  "createdAt",
  "updatedAt"
)
SELECT
  'inventory-scope-' || users."id" || '-' || kinds."itemKind",
  users."id",
  kinds."itemKind",
  users."role" = 'STORE_OFFICER',
  users."role" = 'ENGINEER',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" AS users
CROSS JOIN (
  VALUES ('SPARE_PART'), ('CHEMICAL'), ('OIL')
) AS kinds("itemKind")
WHERE users."active" = TRUE
  AND users."role" IN ('STORE_OFFICER', 'ENGINEER')
ON CONFLICT ("userId", "itemKind") DO NOTHING;

ALTER TABLE "UserInventoryScope" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserInventoryScope" FROM anon, authenticated;
