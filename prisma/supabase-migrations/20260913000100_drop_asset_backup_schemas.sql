BEGIN;

-- The user explicitly requested permanent deletion of legacy Asset backups.
DROP SCHEMA IF EXISTS asset_r8_backup_20260912 CASCADE;
DROP SCHEMA IF EXISTS asset_refactor_backup_20260908 CASCADE;

COMMIT;
