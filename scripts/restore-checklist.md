# PowerCare.CM Restore Checklist

Use this checklist when testing a restore or recovering a production incident.

## Before Restore

- [ ] Confirm the backup folder has `manifest.json`.
- [ ] Confirm database dump exists: `database/powercare-public.dump`.
- [ ] Confirm storage folders exist:
  - [ ] `storage/powercare-profile-photos`
  - [ ] `storage/powercare-signatures`
  - [ ] `storage/powercare-asset-files`
- [ ] Confirm target Supabase project is correct.
- [ ] Confirm downtime window with users.
- [ ] Save current target `.env.production` or deployment environment variables.

## Restore Database

- [ ] Create or select target Supabase project.
- [ ] Set/reset database user passwords, including `prisma`.
- [ ] Restore database dump with `pg_restore`.
- [ ] Run Prisma generate for Supabase schema:

```powershell
npm run db:generate:supabase
```

- [ ] Compare row counts with `database/table-counts.json`.

## Restore Storage

- [ ] Re-create private bucket `powercare-profile-photos`.
- [ ] Re-create private bucket `powercare-signatures`.
- [ ] Re-create private bucket `powercare-asset-files`.
- [ ] Confirm bucket file limits and MIME types:
  - profile photos: 1 MB, PNG/JPG/WebP
  - signatures: 500 KB, PNG/JPG
  - Asset files: 20 MB, PNG/JPG/WebP/PDF/DOCX/XLSX
- [ ] Upload objects back to the same paths from the backup folder.
- [ ] Confirm random profile photo can be opened through `/profile-photo/[userId]`.
- [ ] Confirm random signature can be opened through `/signatures/[userId]`.
- [ ] Confirm random Asset image can be opened through `/asset-images/[assetId]`.

## Application Verification

- [ ] Login as admin.
- [ ] Login as electrical technician.
- [ ] Login as mechanical technician.
- [ ] Dashboard loads.
- [ ] CM Work List loads.
- [ ] Create Request works.
- [ ] Track Work works.
- [ ] Upload profile photo.
- [ ] Upload signature.
- [ ] Upload Asset image.
- [ ] Print completion document shows signatures.
- [ ] Admin Users page can edit user data.
- [ ] Audit Trail page loads.

## Go / No-Go

- [ ] No missing user records.
- [ ] No missing CM work records.
- [ ] Latest CM number sequence is correct.
- [ ] Storage image/signature previews load.
- [ ] New request receives the next correct CM number.
- [ ] Backup after restore has been created.
