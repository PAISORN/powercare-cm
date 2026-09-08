# Asset Refactor Implementation Report

Date: 2026-09-08

## Applied scope

The user authorized a replace-all Asset rollout. The reviewed workbook is the new source of truth for Assets; preservation requirements for legacy Asset, PM, and CM relationships in the original pack do not apply to this rollout.

- Source: `prisma/data/PowerCare_Asset_Review_20260905.xlsx`
- Source SHA-256: `b0e18eb3f248fce66421c936a2782ae65fb66f4da854d34964463899a33d5e09`
- Asset hierarchy: Site -> System -> Main Asset -> Sub-Asset -> Part
- Area/Zone remains location metadata.
- Asset Type remains equipment classification.
- Instrument and Valve types are Parts and cannot become root Systems.
- Asset Codes use `MC-[3-letter type]-[3 digits]`; `MC-ARC-5001` through `MC-ARC-5007` are the only approved exceptions.
- New Assets reserve their code through a Site and Asset Type sequence inside a serializable transaction.

## Local replacement result

The SQLite migration and replacement were first verified on a temporary database copy. The same process was then applied to `prisma/dev.db` after a hash-verified backup.

- Assets: 880
- Unique valid Asset Codes: 880
- Approved source codes: 180
- Approved ARC exceptions: 7
- Generated codes: 693
- Systems: 15
- Areas: 16
- Asset Types / code sequences: 64 / 64
- Main Assets / Sub-Assets / Parts: 330 / 158 / 392
- Control Valve / Pressure Regulating Valve: 19 / 3
- Duplicate codes / invalid codes / orphan parents: 0 / 0 / 0
- Legacy PM Works / PM Group memberships / CM-to-PM links for RTB: 0 / 0 / 0

The workbook contains incomplete hierarchy data. These rows were imported without invented Systems or Parents and are visible in the migration review queue:

- READY: 501
- NEED_PARENT_REVIEW: 371
- NEED_REVIEW: 8
- Rows without a source System: 282, primarily Manual and Safety Valves from the workbook's `Valve` grouping
- Rows missing a usable Parent: 371
- Rows with an invalid source Parent level: 19

## Files and commands

- SQLite migration: `prisma/migrations/20260908000100_asset_hierarchy_refactor/migration.sql`
- PostgreSQL migration: `prisma/supabase-migrations/20260908000100_asset_hierarchy_refactor.sql`
- Replace command: `npm run asset:replace:workbook -- --commit`
- Read-only verification: `npx tsx scripts/verify-asset-replacement.ts`
- Local backup: `prisma/backups/dev-before-asset-replace-20260908.db`
- Backup SHA-256: `3C024229824E5CB866A4B463FAB90CCF7C5E858B6E2E8704C80EEA6D4CB85D31`

## Verification

- SQLite and Supabase Prisma schemas: valid
- Asset-focused tests: 9 files, 61 tests passed
- Full Vitest suite: 222 files, 888 tests passed
- Production Vercel build: passed, including TypeScript and 61 static pages
- Final TypeScript check after restoring the SQLite Prisma client: passed
- `git diff --check`: passed
## Production order

1. Back up the target database and verify the backup.
2. Apply `prisma/supabase-migrations/20260908000100_asset_hierarchy_refactor.sql`.
3. Deploy the matching application code and generated Prisma client.
4. Run the replace command against the target database.
5. Run the verifier and compare every count above before opening Asset maintenance to users.

## Rollback

Restore the verified pre-replacement database backup together with the prior application version. A partial row-level rollback is not supported because the rollout intentionally replaces the legacy Asset masters, Assets, PM Works, and PM Group memberships.
## Production CM history preservation

The final production backup snapshot found 28 CM Works linked to 22 legacy Assets. All 22 mappings are confirmed. The dataset adds Hopper Heater No.3 and TRCC-1 as production-only Electrical Equipment, bringing the import to 880 Assets. During replacement, all linked CM Works receive old Asset Code and name snapshots before deletion and all 28 reconnect to new Asset IDs after import. See `docs/asset-refactor/production-cm-mapping/README.md`.