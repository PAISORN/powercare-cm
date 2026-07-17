CREATE INDEX IF NOT EXISTS "StockMovement_actorId_idx"
ON "StockMovement"("actorId");

CREATE INDEX IF NOT EXISTS "SparePartReceiveItem_receiveId_idx"
ON "SparePartReceiveItem"("receiveId");

CREATE INDEX IF NOT EXISTS "SparePartIssueItem_issueId_idx"
ON "SparePartIssueItem"("issueId");
