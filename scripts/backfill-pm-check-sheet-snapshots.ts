import { writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";
import { loadPmCheckSheetSnapshots, serializePmCheckSheetSnapshot } from "../modules/pm/pm-check-sheet";

type BackfillRow = {
  id: string;
  number: string;
  assetId: string;
  status: string;
  worksheetDataJson: string | null;
  checkSheetSnapshotJson: string | null;
};

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const production = args.has("--production");
  const confirmedProduction = args.has("--confirm-production");
  const backupArg = process.argv.slice(2).find((arg) => arg.startsWith("--backup="));
  if (production && !confirmedProduction) throw new Error("Production backfill requires --confirm-production");
  if (apply && !backupArg) throw new Error("Apply requires --backup=<absolute-or-workspace-path>");

  const rows = await db.pmWork.findMany({
    where: { checkSheetSnapshotJson: null },
    select: { id: true, number: true, assetId: true, status: true, worksheetDataJson: true, checkSheetSnapshotJson: true },
    orderBy: { number: "asc" },
  }) as BackfillRow[];
  const snapshots = await loadPmCheckSheetSnapshots(db, rows.filter((row) => row.status !== "COMPLETED").map((row) => row.assetId));
  const completedSnapshots = await loadPmCheckSheetSnapshots(db, rows.filter((row) => row.status === "COMPLETED").map((row) => row.assetId), { includeInactive: true });
  const candidates = rows.map((row) => ({
    ...row,
    generatedSnapshotJson: serializePmCheckSheetSnapshot((row.status === "COMPLETED" ? completedSnapshots : snapshots).get(row.assetId)),
  }));
  const missingAssets = candidates.filter((row) => !row.generatedSnapshotJson);
  const ready = candidates.filter((row) => row.generatedSnapshotJson);

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", production, totalWithoutSnapshot: rows.length, ready: ready.length, missingAssets: missingAssets.length, completed: rows.filter((row) => row.status === "COMPLETED").length }, null, 2));
  if (missingAssets.length) console.log("Missing Asset snapshots:", missingAssets.map((row) => `${row.number}:${row.assetId}`).join(", "));
  if (!apply) return;

  const backupPath = path.resolve(backupArg!.slice("--backup=".length));
  await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), production, rows: candidates }, null, 2), { flag: "wx" });
  await db.$transaction(async (tx) => {
    for (const row of ready) {
      const changed = await tx.pmWork.updateMany({
        where: { id: row.id, checkSheetSnapshotJson: null },
        data: { checkSheetSnapshotJson: row.generatedSnapshotJson },
      });
      if (changed.count !== 1) throw new Error(`PM Work changed during backfill: ${row.number}`);
    }
  });
  console.log(`Backfilled ${ready.length} PM Work snapshots. Backup: ${backupPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => db.$disconnect());
