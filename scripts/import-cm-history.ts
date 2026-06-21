import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { reserveCmWorkNumber } from "../modules/cm-work/cm-work-sequence";
import { Urgency, WorkStatus } from "../modules/cm-work/cm-work-types";

type ImportArgs = {
  filePath: string;
  replaceAll: boolean;
  dryRun: boolean;
};

type ImportRow = {
  legacyNumber: string | null;
  createdAt: Date;
  requesterName: string;
  requesterDepartment: string;
  category: string;
  zone: string;
  machineName: string;
  problemTitle: string;
  problemDetail: string;
  urgency: string;
  status: string;
  claimantName: string | null;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  waitingToCloseAt: Date | null;
  closedAt: Date | null;
  rootCause: string | null;
  correctiveAction: string | null;
  workNote: string | null;
  engineerNote: string | null;
  reviewerName: string | null;
  canceledReason: string | null;
  returnedReason: string | null;
  releaseReason: string | null;
};

const REQUIRED_HEADERS = [
  "Legacy CM Number",
  "Created Date",
  "Requester Name",
  "Requester Department",
  "Category",
  "Zone",
  "Machine Name",
  "Problem Title",
  "Problem Detail",
  "Urgency Code",
  "Current Status Code",
] as const;

function loadEnvFromFile(fileName: string) {
  const filePath = path.resolve(fileName);
  try {
    const text = readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const separator = line.indexOf("=");
      if (separator < 1) {
        continue;
      }
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    return;
  }
}

function parseArgs(argv: string[]): ImportArgs {
  const args: ImportArgs = {
    filePath: path.resolve("outputs/cm-history-import-2026-record-filled.xlsx"),
    replaceAll: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--file") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("Missing value after --file");
      }
      args.filePath = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--replace-all") {
      args.replaceAll = true;
      continue;
    }
    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }
  }

  return args;
}

function normalizeText(value: unknown) {
  if (value == null) {
    return "";
  }
  return String(value).trim().replace(/\s+/g, " ");
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return null;
    }
    return new Date(
      Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S ?? 0)),
    );
  }
  const text = normalizeText(value);
  if (!text) {
    return null;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function parseWorkbook(filePath: string) {
  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets.CM_History_Import;
  if (!sheet) {
    throw new Error(`Sheet CM_History_Import not found in ${filePath}`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  }) as Record<string, unknown>[];

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !(header in (rows[0] ?? {})));
  if (rows.length === 0 || missingHeaders.length > 0) {
    throw new Error(
      `Import file is missing required headers: ${missingHeaders.length ? missingHeaders.join(", ") : "no data rows found"}`,
    );
  }

  return rows
    .map((row): ImportRow | null => {
      const createdAt = parseDate(row["Created Date"]);
      const requesterName = normalizeText(row["Requester Name"]);
      const requesterDepartment = normalizeText(row["Requester Department"]);
      const category = normalizeText(row["Category"]);
      const zone = normalizeText(row["Zone"]);
      const machineName = normalizeText(row["Machine Name"]);
      const problemTitle = normalizeText(row["Problem Title"]);
      const problemDetail = normalizeText(row["Problem Detail"]);
      const urgency = normalizeText(row["Urgency Code"]) || Urgency.NORMAL;
      const status = normalizeText(row["Current Status Code"]) || WorkStatus.NEW;

      const hasAnyRealData =
        normalizeText(row["Legacy CM Number"]) ||
        requesterName ||
        requesterDepartment ||
        category ||
        zone ||
        machineName ||
        problemTitle ||
        problemDetail;

      if (!hasAnyRealData) {
        return null;
      }

      if (!createdAt) {
        throw new Error(`Created Date is required for machine "${machineName || problemTitle || "unknown"}"`);
      }
      if (!requesterName || !requesterDepartment || !category || !zone || !machineName || !problemTitle) {
        throw new Error(`Import row is missing required text fields for machine "${machineName || "unknown"}"`);
      }

      return {
        legacyNumber: normalizeText(row["Legacy CM Number"]) || null,
        createdAt,
        requesterName,
        requesterDepartment,
        category,
        zone,
        machineName,
        problemTitle,
        problemDetail: problemDetail || problemTitle,
        urgency,
        status,
        claimantName: normalizeText(row["Claimant Name"]) || null,
        claimedAt: parseDate(row["Claimed Date"]),
        inProgressAt: parseDate(row["In Progress Date"]),
        waitingToCloseAt: parseDate(row["Waiting Close Date"]),
        closedAt: parseDate(row["Closed Date"]),
        rootCause: normalizeText(row["Root Cause"]) || null,
        correctiveAction: normalizeText(row["Corrective Action"]) || null,
        workNote: normalizeText(row["Work Note"]) || null,
        engineerNote: normalizeText(row["Engineer Note"]) || null,
        reviewerName: normalizeText(row["Reviewer Name"]) || null,
        canceledReason: normalizeText(row["Canceled Reason"]) || null,
        returnedReason: normalizeText(row["Returned Reason"]) || null,
        releaseReason: normalizeText(row["Release Reason"]) || null,
      };
    })
    .filter((row: ImportRow | null): row is ImportRow => Boolean(row));
}

async function backupExistingData(db: PrismaClient) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(".tmp/import-backups");
  await fs.mkdir(backupDir, { recursive: true });

  const snapshot = await db.cmWork.findMany({
    include: {
      statusHistory: true,
      auditEvents: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const backupPath = path.join(backupDir, `cm-work-backup-${now}.json`);
  await fs.writeFile(backupPath, JSON.stringify(snapshot, null, 2), "utf8");
  return backupPath;
}

async function main() {
  loadEnvFromFile(".env.local");
  loadEnvFromFile(".env");

  const args = parseArgs(process.argv.slice(2));
  const rows = parseWorkbook(args.filePath);
  const db = new PrismaClient();

  try {
    const categories = await db.category.findMany({ where: { active: true } });
    const zones = await db.zone.findMany({ where: { active: true } });
    const users = await db.user.findMany({ where: { active: true } });

    const categoryMap = new Map(categories.map((item) => [item.name, item]));
    const zoneMap = new Map(zones.map((item) => [item.name, item]));
    const userMap = new Map(users.map((item) => [item.fullName, item]));

    for (const row of rows) {
      if (!categoryMap.has(row.category)) {
        throw new Error(`Unknown category in import file: ${row.category}`);
      }
      if (!zoneMap.has(row.zone)) {
        throw new Error(`Unknown zone in import file: ${row.zone}`);
      }
      if (!(row.urgency in Urgency)) {
        throw new Error(`Unknown urgency in import file: ${row.urgency}`);
      }
      if (!(row.status in WorkStatus)) {
        throw new Error(`Unknown status in import file: ${row.status}`);
      }
    }

    const summary = rows.reduce((accumulator: Record<string, number>, row: ImportRow) => {
      accumulator[row.status] = (accumulator[row.status] ?? 0) + 1;
      return accumulator;
    }, {});

    if (args.dryRun) {
      console.log(
        JSON.stringify(
          {
            mode: "dry-run",
            filePath: args.filePath,
            replaceAll: args.replaceAll,
            rows: rows.length,
            summary,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (!args.replaceAll) {
      throw new Error("This importer currently requires --replace-all to avoid accidental duplicate historical imports.");
    }

    const backupPath = await backupExistingData(db);

    const result = await db.$transaction(
      async (tx) => {
        await tx.auditEvent.deleteMany({});
        await tx.statusHistory.deleteMany({});
        await tx.cmWork.deleteMany({});
        await tx.cmNumberSequence.deleteMany({});

        for (const row of rows) {
          const category = categoryMap.get(row.category)!;
          const zone = zoneMap.get(row.zone)!;
          const claimant = row.claimantName ? userMap.get(row.claimantName) ?? null : null;
          const reviewer = row.reviewerName ? userMap.get(row.reviewerName) ?? null : null;
          const number = await reserveCmWorkNumber(tx, row.createdAt);
          const importedNote = [row.workNote, row.legacyNumber ? `Legacy CM Number: ${row.legacyNumber}` : null]
            .filter(Boolean)
            .join(" | ");

          const latestStatusDate =
            row.closedAt ??
            row.waitingToCloseAt ??
            row.inProgressAt ??
            row.claimedAt ??
            row.createdAt;

          await tx.cmWork.create({
            data: {
              number,
              requesterName: row.requesterName,
              requesterDepartment: row.requesterDepartment,
              categoryId: category.id,
              zoneId: zone.id,
              machineName: row.machineName,
              problemTitle: row.problemTitle,
              problemDetail: row.problemDetail,
              urgency: row.urgency,
              status: row.status,
              claimantId: claimant?.id ?? null,
              claimedAt: row.claimedAt,
              inProgressAt: row.inProgressAt,
              waitingToCloseAt:
                row.waitingToCloseAt ??
                (row.status === WorkStatus.WAITING_TO_CLOSE ? row.createdAt : null),
              closedAt: row.closedAt,
              reviewerId: reviewer?.id ?? null,
              rootCause: row.rootCause,
              correctiveAction: row.correctiveAction,
              workNote: importedNote || null,
              engineerNote: row.engineerNote,
              canceledReason: row.canceledReason,
              returnedReason: row.returnedReason,
              releaseReason: row.releaseReason,
              createdAt: row.createdAt,
              statusHistory: {
                create: {
                  toStatus: row.status,
                  changedAt: latestStatusDate,
                  note: row.legacyNumber
                    ? `Imported from CM history spreadsheet (${row.legacyNumber})`
                    : "Imported from CM history spreadsheet",
                },
              },
            },
          });
        }

        return {
          inserted: rows.length,
        };
      },
      {
        maxWait: 10000,
        timeout: 120000,
      },
    );

    console.log(
      JSON.stringify(
        {
          filePath: args.filePath,
          replaceAll: args.replaceAll,
          backupPath,
          ...result,
          summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
