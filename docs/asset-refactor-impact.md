# Asset refactor impact

Updated 2026-09-08 after the replace-all rollout decision.

## Decision override

The source pack originally requires preserving legacy Asset IDs and PM/CM references. The user explicitly authorized treating the reviewed workbook as the new Asset database, deleting legacy Assets, and ignoring PM/CM impact for this rollout. This implementation follows that user instruction.

## Data model and runtime

`AssetSystem` is restored as a Site-scoped master. `Asset` stores System, hierarchy level, discipline, Tag/KKS, Registration Code, key specification, metadata, and migration status. `AssetType` stores its three-letter code, discipline, and default level. `AssetCodeSequence` provides a unique Site and type sequence used by server-side Asset creation.

Create, edit, import, export, list/tree, detail, QR, and master-data screens use the shared hierarchy rules. System selection is separate from Area/Zone. Instrument and Valve types resolve to Parts and cannot be used as Systems.

## Replacement behavior

The replacement transaction removes RTB PM Group Asset memberships, detaches CM records that originate from removed PM Works, removes PM Work assignees and source groups, deletes PM Works, then deletes and recreates Asset records and Asset masters. Existing CM records that directly reference deleted Assets are set to null by the schema relation.

Parents are connected only when the workbook provides a resolvable and valid source relationship. Missing or invalid hierarchy data is imported with a review status instead of a fabricated System or Parent.

## Asset Code behavior

Runtime creation generates `MC-[TYPE]-[NNN]` in a serializable transaction using a unique Site and Asset Type sequence. The workbook importer retains valid approved source codes, maps the seven approved Rotary Air Lock exceptions to `MC-ARC-5001` through `MC-ARC-5007`, and generates codes for remaining rows. Tag/KKS and Registration Code remain separate fields.

## Deployment and rollback

Apply the PostgreSQL migration before the application and data replacement. Asset System and Asset Code Sequence use server-only RLS and grants. Verify the 878-row result with `scripts/verify-asset-replacement.ts`. Rollback requires restoration of the full pre-replacement database backup and matching application version.