# PowerCare.CM Backup and Restore

This document describes the minimum backup process for the PowerCare.CM pilot/production setup on Supabase.

## What Must Be Backed Up

Back up both parts every time:

1. PostgreSQL database
   - CM work records
   - users, roles, categories, zones
   - audit history
   - CM number sequence
   - metadata rows for profile photos and signatures

2. Supabase Storage
   - `powercare-profile-photos`
   - `powercare-signatures`

Supabase database backups do not restore Storage objects. The database only keeps file metadata, so Storage files must be backed up separately.

## Recommended Schedule

For pilot:

- Run manual backup before every schema/database change.
- Run daily backup at end of working day if users are testing with real data.
- Keep at least 7 daily backups.

For production:

- Daily database + storage backup.
- Weekly backup kept for at least 4 weeks.
- Monthly backup kept for at least 3 months.
- Test restore at least once per month.
- Consider Supabase Pro with daily backups or PITR when the system holds real plant records.

## Local Backup Command

Make sure `.env.local` contains:

```env
DATABASE_URL="..."
DIRECT_URL="..."
SUPABASE_URL="https://fbpwiwbrxongamzdnmcx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_PROFILE_PHOTOS_BUCKET="powercare-profile-photos"
SUPABASE_SIGNATURES_BUCKET="powercare-signatures"
```

Then run:

```powershell
npm run backup:supabase
```

The backup is written to:

```text
backups/YYYYMMDD-HHMMSS/
```

The folder contains:

- `database/powercare-public.dump` if `pg_dump` is installed
- `database/schema.sql`
- `database/table-counts.json`
- `storage/powercare-profile-photos/...`
- `storage/powercare-signatures/...`
- `manifest.json`

If `pg_dump` is not installed, the script still exports a schema snapshot and table counts, but this is not a full restore-ready database backup. Install PostgreSQL client tools before relying on it.

## Restore Approach

Preferred production restore:

1. Create or choose the target Supabase project.
2. Restore the database first.
3. Re-create/reset custom database role passwords, including `prisma`.
4. Re-create Storage buckets if needed:
   - `powercare-profile-photos`, private, max 1 MB, `image/png,image/jpeg,image/webp`
   - `powercare-signatures`, private, max 500 KB, `image/png,image/jpeg`
5. Upload Storage files from the backup folder.
6. Set application environment variables for the restored project.
7. Run the restore checklist in `scripts/restore-checklist.md`.

## Restore Command Notes

For a custom-format dump:

```powershell
pg_restore --dbname "<TARGET_DATABASE_URL>" --clean --if-exists --no-owner --no-privileges "backups/<timestamp>/database/powercare-public.dump"
```

For a new Supabase project, some ownership/permission messages can be expected. Review errors carefully and test the application after restore.

## Dashboard Backup Notes

On paid Supabase plans, use Supabase Dashboard backups as the first recovery option:

```text
Database > Backups
```

Storage still needs separate export/import. Supabase documents that database backups do not include Storage objects.

## References

- Supabase Database Backups: https://supabase.com/docs/guides/platform/backups
- Supabase Download Objects: https://supabase.com/docs/guides/storage/management/download-objects
- Supabase Backup/Restore migration guide: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
