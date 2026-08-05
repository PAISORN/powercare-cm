# Inventory User Scopes — Production Migration

Migration file: `prisma/supabase-migrations/20260805000100_inventory_user_scopes.sql`

## Before applying

1. Back up the Production Supabase database and confirm the backup can be restored.
2. Confirm the target project reference is the Production project intended for this release.
3. Confirm no Store Issue contains more than one Inventory Item Kind:

```sql
SELECT issue."id", issue."number", COUNT(DISTINCT part."itemKind") AS kind_count
FROM "SparePartIssue" issue
JOIN "SparePartIssueItem" item ON item."issueId" = issue."id"
JOIN "SparePart" part ON part."id" = item."sparePartId"
GROUP BY issue."id", issue."number"
HAVING COUNT(DISTINCT part."itemKind") > 1;
```

Expected result: zero rows.

## Apply

Run `20260805000100_inventory_user_scopes.sql` once through the reviewed Supabase migration process. Do not use the SQLite migration file on Supabase.

The migration:

- adds `SparePartIssue.itemKind` and backfills it from the first issue line;
- creates `UserInventoryScope` with responsibility and approval scopes;
- gives every active existing Store Officer responsibility for all three existing kinds;
- gives every active existing Engineer approval scope for all three existing kinds;
- creates lookup indexes;
- enables RLS and revokes browser-role access to the new table.

## Verify after applying

```sql
SELECT "itemKind", COUNT(*)
FROM "SparePartIssue"
GROUP BY "itemKind"
ORDER BY "itemKind";

SELECT "itemKind", "responsibilityEnabled", "approvalEnabled", COUNT(*)
FROM "UserInventoryScope"
GROUP BY "itemKind", "responsibilityEnabled", "approvalEnabled"
ORDER BY "itemKind", "responsibilityEnabled", "approvalEnabled";

SELECT COUNT(*) AS missing_issue_kind
FROM "SparePartIssue"
WHERE "itemKind" IS NULL OR "itemKind" NOT IN ('SPARE_PART', 'CHEMICAL', 'OIL');
```

Expected `missing_issue_kind`: `0`.

## Application smoke test

1. Create or configure a Chemical approver Engineer.
2. Configure a Store Officer with Chemical responsibility only.
3. Create a Chemical Store Issue with multiple Chemical lines.
4. Confirm only an eligible Engineer sees and approves it.
5. Confirm the requester and approver cannot issue it.
6. Confirm the Chemical Store Officer can issue it once and print one document.
7. Confirm the same Store Officer can view Spare Part and Oil stock but cannot mutate either.

Production SQL has been prepared but must not be applied until backup, review, and explicit release approval are complete.
