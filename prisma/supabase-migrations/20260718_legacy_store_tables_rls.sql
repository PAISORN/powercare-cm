-- Secure legacy store tables retained temporarily for production rollback.
-- Each block is guarded so this migration also succeeds where the legacy
-- table has already been removed.
DO $$
BEGIN
  IF to_regclass('public."SparePartIssueItemSequence"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "SparePartIssueItemSequence" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE "SparePartIssueItemSequence" FROM anon, authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SparePartIssueItemSequence" TO prisma';
    EXECUTE 'DROP POLICY IF EXISTS "spare_part_issue_item_sequence_prisma_server_access" ON "SparePartIssueItemSequence"';
    EXECUTE 'CREATE POLICY "spare_part_issue_item_sequence_prisma_server_access" ON "SparePartIssueItemSequence" FOR ALL TO prisma USING (true) WITH CHECK (true)';
  END IF;

  IF to_regclass('public."SparePartStorageZone"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "SparePartStorageZone" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE "SparePartStorageZone" FROM anon, authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SparePartStorageZone" TO prisma';
    EXECUTE 'DROP POLICY IF EXISTS "spare_part_storage_zone_prisma_server_access" ON "SparePartStorageZone"';
    EXECUTE 'CREATE POLICY "spare_part_storage_zone_prisma_server_access" ON "SparePartStorageZone" FOR ALL TO prisma USING (true) WITH CHECK (true)';
  END IF;
END
$$;
