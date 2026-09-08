# Production CM Asset Mapping

Extracted read-only from Supabase project `powercare-cm` (`fbpwiwbrxongamzdnmcx`) on 2026-09-08.

## Production snapshot

- Production Assets: 395
- CM Works at backup snapshot: 228
- CM Works linked to an Asset: 28
- Distinct legacy Assets with CM history: 22
- CM Works without an Asset: 200
- Unlinked CM Works with an Asset Code or Asset Name snapshot: 0

## Final mapping

- CONFIRMED: 22 legacy Assets / 28 CM Works
- REVIEW: 0
- UNMATCHED: 0

All linked CM Works receive the old Asset Code and name snapshots before legacy Assets are deleted. Every one of the 28 linked CM Works then reconnects to its deterministic new Asset ID after the 880-Asset import.

## Approved differences

- `RTB-ASC-005` maps to `MC-ASC-005`. Production says `Ash Screw Sealing No. 5`; the new Asset says `Ash Screw Conveyor No. 5`.
- `rtb-DPT-200-001` maps to `MC-DPT-001`. Production says `DPT-200`; the new Asset says `Differential Pressure Transmitter DPT-2001`.

## Added from Production CM history

- `RTB-HPH-003` becomes `MC-EEQ-002` / `HOPPER HEATER NO.3 (HH1-3 JB1)`.
- `RTB-TRC-001` becomes `MC-EEQ-003` / `TRCC-1`.

Both are active Main Assets classified as Electrical Equipment in `ESP & Flue Gas Cleaning`, Area `ESP`, with Medium criticality. Their source legacy codes are retained in Tag/KKS.

## Verification evidence

A temporary SQLite copy was populated with all 22 legacy Asset IDs and 28 CM links. The replacement transaction produced 880 Assets and remapped all 28 CM Works with zero errors while retaining every old Asset Code and name snapshot.

## Artifacts

- `production-assets-with-cm.csv`: exact 22-Asset production extract with CM numbers and counts.
- `production-cm-asset-candidate-mapping.csv`: automatic candidate output retained for audit.
- `production-cm-asset-mapping.csv`: final mapping used by the replacement transaction.
- `prisma/data/production-cm-asset-mapping.csv`: runtime mapping bundled with the importer.
- `prisma/data/production-cm-missing-assets.csv`: the two approved production-only Assets bundled with the importer.