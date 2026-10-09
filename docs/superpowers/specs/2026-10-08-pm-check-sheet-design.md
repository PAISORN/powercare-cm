# PM Check Sheet Design

## Purpose

PM Check Sheet is the Asset-specific form-definition workspace for future PM Work. It combines read-only Default Check Items from the Asset Type's active Technical Field Templates with editable Custom Check Items owned by one Asset.

## Decisions

- Access and mutation require `MANAGE_PM_PLANS`; execution remains governed by existing PM Work permissions.
- Custom items support the same input metadata used by the worksheet: name, data type, unit, choices, help text, indicator, and required state.
- Main, Sub, and Part Assets each own their own Check Sheet. A Main Asset worksheet renders snapshots for the Asset-level PM Works actually released beneath that Main Asset.
- Removing a Custom item is a soft retirement. Existing PM Work snapshots are unchanged.
- Every PM Work snapshots its resolved Default and Custom items when the work is created. See ADR 0008.

## Data and history

`PmCheckSheetItem` stores only Asset-specific Custom items. Default items remain live references to `AssetTechnicalField` while viewing PM Check Sheet Setup, so Template changes appear immediately without copying Template rows.

`PmWork.checkSheetSnapshotJson` stores the immutable versioned form definition. `PmWork.worksheetDataJson` continues to store recorded values. Existing PM Work without a snapshot falls back to the current Check Sheet until the guarded backfill or its next worksheet persistence creates a snapshot.

## Migration and rollout order

1. Back up the target database and verify the exact environment.
2. Apply `20261009174637_pm_check_sheet` after the existing migrations.
3. Generate Prisma Client from `prisma/schema.supabase.prisma` for Production.
4. Run `npm run pm:check-sheet:backfill` as a dry-run and resolve every missing Asset.
5. Run the backfill with `--apply --production --confirm-production --backup=<new backup file>`.
6. Deploy the application and verify menu visibility, Asset isolation, Default/Custom rendering, PM Work snapshot stability, and completed history.

No Production migration or backfill is performed as part of source implementation alone.
