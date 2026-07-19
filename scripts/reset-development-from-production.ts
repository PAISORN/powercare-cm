import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SITE_ADMIN_CONFIGURABLE_PERMISSIONS } from "../modules/auth/site-admin-permissions";

// Destructive Development-only utility. Requires DEVELOPMENT_RESET_PASSWORD,
// DEVELOPMENT_RESET_SOURCE_PROJECT, and --confirm-reset-development.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const developmentDb = path.join(root, "prisma", "dev.db");
const temporaryDb = path.join(root, "prisma", "development-reset.db");
const snapshotPath = path.join(root, ".tmp", "production-cm-snapshot.json");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const resetConfirmationFlag = "--confirm-reset-development";

const resetMemberPassword = process.env.DEVELOPMENT_RESET_PASSWORD?.trim();
const approvedProductionProject = process.env.DEVELOPMENT_RESET_SOURCE_PROJECT?.trim();

const organization = {
  id: "dev-org-mitrphol",
  slug: "mitrphol",
  name: "MITRPHOL",
};

const plant = {
  id: "dev-site-rungtiva",
  organizationId: organization.id,
  code: "rungtiva",
  inventoryCode: "RTB",
  name: "RUNGTIVA",
};

const organizationAdmin = {
  id: "dev-organization-admin-mitrphol",
  username: "mitrpholadmin",
  fullName: "MITRPHOL Organization Admin",
  department: "MITRPHOL",
  role: "ORGANIZATION_ADMIN",
};

const siteAdmin = {
  id: "dev-site-admin-rungtiva",
  username: "rungtivaadmin",
  fullName: "RUNGTIVA Site Admin",
  department: "RUNGTIVA",
  role: "SITE_ADMIN",
};

const preferredStoreZoneOrder = [
  "Fuel preparation",
  "Fuel Warehouse",
  "Boiler&Combustion",
  "Turbine",
  "ESP",
  "Water Treatment Plant",
  "Cooling Tower",
  "Vehicle",
  "Office",
  "Other",
];

function storeZoneRank(name: unknown) {
  const normalizedName = String(name ?? "");
  const index = preferredStoreZoneOrder.findIndex(
    (entry) => entry.localeCompare(normalizedName, undefined, { sensitivity: "base" }) === 0,
  );
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

type Snapshot = {
  exportedAt: string;
  sourceProject: string;
  users: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  zones: Record<string, unknown>[];
  works: Record<string, unknown>[];
  statusHistory: Record<string, unknown>[];
  sequences: Record<string, unknown>[];
};

function sqliteUrl(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function asDate(value: unknown) {
  return value == null ? null : new Date(String(value));
}

function requireFile(filePath: string, label: string) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
}

function createClient(filePath: string) {
  return new PrismaClient({
    datasources: { db: { url: sqliteUrl(filePath) } },
    log: ["error"],
  });
}

function assertDevelopmentResetSafety() {
  if (!process.argv.includes(resetConfirmationFlag)) {
    throw new Error(
      `Reset stopped. Re-run with ${resetConfirmationFlag} after confirming that only the local Development database may be replaced.`,
    );
  }

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("Reset stopped. This utility cannot run in Production or Vercel.");
  }

  const configuredDatabaseUrl = process.env.DATABASE_URL?.trim().toLowerCase();
  if (configuredDatabaseUrl && !configuredDatabaseUrl.startsWith("file:")) {
    throw new Error("Reset stopped. DATABASE_URL must use a local SQLite file, not PostgreSQL or Supabase.");
  }

  const expectedDevelopmentDb = path.resolve(root, "prisma", "dev.db");
  if (path.resolve(developmentDb) !== expectedDevelopmentDb || path.extname(developmentDb).toLowerCase() !== ".db") {
    throw new Error("Reset stopped. Target must be the workspace-local prisma/dev.db file.");
  }

  if (!resetMemberPassword || resetMemberPassword.length < 12) {
    throw new Error("Reset stopped. DEVELOPMENT_RESET_PASSWORD must be set and contain at least 12 characters.");
  }

  if (!approvedProductionProject) {
    throw new Error("Reset stopped. DEVELOPMENT_RESET_SOURCE_PROJECT must be set to the approved read-only snapshot project ID.");
  }
}

function runPrismaDbPush() {
  if (process.argv.includes("--use-prepared-db")) {
    requireFile(temporaryDb, "Prepared temporary Development database");
    return;
  }

  fs.mkdirSync(path.dirname(temporaryDb), { recursive: true });
  for (const suffix of ["", "-journal", "-shm", "-wal"]) {
    const candidate = temporaryDb + suffix;
    if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true });
  }

  const result = spawnSync(
    process.execPath,
    [prismaCli, "db", "push", "--schema", schemaPath, "--skip-generate"],
    {
      cwd: root,
      // Prisma 5 schema engine on Windows fails for absolute SQLite URLs when
      // the workspace path contains spaces. Relative URLs resolve from schema.prisma.
      env: {
        ...process.env,
        DATABASE_URL: "file:development-reset.db",
        // On this Windows workspace the Prisma 5 schema engine exits during
        // cold start unless Rust logging keeps the engine process attached.
        RUST_LOG: process.env.RUST_LOG ?? "debug",
      },
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    const detail = result.error?.message ?? `Prisma exited with status ${String(result.status)}`;
    throw new Error(`Could not create temporary Development database schema: ${detail}`);
  }
}

async function main() {
  assertDevelopmentResetSafety();
  requireFile(developmentDb, "Development database");
  requireFile(snapshotPath, "Read-only Production snapshot");
  requireFile(prismaCli, "Local Prisma CLI");

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as Snapshot;
  if (snapshot.sourceProject !== approvedProductionProject) {
    throw new Error("Production snapshot project does not match the approved Production project.");
  }
  if (!Array.isArray(snapshot.works) || snapshot.works.length === 0) {
    throw new Error("Production snapshot has no CM work records. Reset stopped.");
  }

  const source = createClient(developmentDb);
  const owner = await source.user.findFirst({
    where: { username: "admin", role: "ADMIN" },
    include: { signature: true, profilePhoto: true },
  });
  await source.$disconnect();
  if (!owner) throw new Error("Main Owner account 'admin' was not found. Reset stopped.");

  const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(root, "backups", `development-reset-${backupStamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(developmentDb, path.join(backupDir, "dev-before-reset.db"));
  fs.copyFileSync(snapshotPath, path.join(backupDir, "production-cm-snapshot.json"));

  runPrismaDbPush();
  const target = createClient(temporaryDb);
  const sharedDevelopmentPasswordHash = await bcrypt.hash(resetMemberPassword!, 12);

  const memberUsernames = new Set(snapshot.users.map((user) => String(user.username).toLowerCase()));
  for (const reserved of [organizationAdmin.username, siteAdmin.username, owner.username]) {
    if (memberUsernames.has(reserved.toLowerCase())) {
      throw new Error(`Production member username conflicts with Development account: ${reserved}`);
    }
  }

  await target.organization.create({ data: organization });
  await target.plant.create({
    data: {
      ...plant,
      publicStoreIssueEnabled: false,
      publicStoreIssueContactRequired: false,
      active: true,
    },
  });

  await target.user.create({
    data: {
      id: owner.id,
      username: owner.username,
      passwordHash: owner.passwordHash,
      fullName: owner.fullName,
      department: owner.department,
      role: "ADMIN",
      organizationId: null,
      plantId: null,
      categoryId: null,
      active: true,
      lastSeenAt: null,
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
    },
  });

  if (owner.signature) {
    await target.signature.create({
      data: {
        id: owner.signature.id,
        userId: owner.id,
        fileName: owner.signature.fileName,
        mimeType: owner.signature.mimeType,
        fileSize: owner.signature.fileSize,
        storagePath: owner.signature.storagePath,
        uploadedAt: owner.signature.uploadedAt,
      },
    });
  }
  if (owner.profilePhoto) {
    await target.profilePhoto.create({
      data: {
        id: owner.profilePhoto.id,
        userId: owner.id,
        fileName: owner.profilePhoto.fileName,
        mimeType: owner.profilePhoto.mimeType,
        fileSize: owner.profilePhoto.fileSize,
        storagePath: owner.profilePhoto.storagePath,
        checksum: owner.profilePhoto.checksum,
        uploadedAt: owner.profilePhoto.uploadedAt,
        updatedAt: owner.profilePhoto.updatedAt,
      },
    });
  }

  await target.user.createMany({
    data: [
      {
        ...organizationAdmin,
        passwordHash: sharedDevelopmentPasswordHash,
        organizationId: organization.id,
        plantId: null,
        categoryId: null,
        active: true,
      },
      {
        ...siteAdmin,
        passwordHash: sharedDevelopmentPasswordHash,
        organizationId: organization.id,
        plantId: plant.id,
        categoryId: null,
        active: true,
      },
    ],
  });

  await target.category.createMany({
    data: snapshot.categories.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      organizationId: organization.id,
      plantId: plant.id,
      active: Boolean(row.active),
      createdAt: asDate(row.createdAt)!,
      updatedAt: asDate(row.updatedAt)!,
    })),
  });

  await target.zone.createMany({
    data: snapshot.zones.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      plantId: plant.id,
      active: Boolean(row.active),
      createdAt: asDate(row.createdAt)!,
      updatedAt: asDate(row.updatedAt)!,
    })),
  });

  const activeZones = snapshot.zones
    .filter((row) => Boolean(row.active))
    .sort(
      (left, right) =>
        storeZoneRank(left.name) - storeZoneRank(right.name) ||
        String(left.name).localeCompare(String(right.name), "en"),
    );
  if (activeZones.length) {
    await target.storeApplicableZone.createMany({
      data: activeZones.map((row, index) => ({
        organizationId: organization.id,
        plantId: plant.id,
        zoneId: String(row.id),
        code: String(index + 1).padStart(2, "0"),
        active: true,
      })),
    });
  }

  await target.user.createMany({
    data: snapshot.users.map((row) => ({
      id: String(row.id),
      username: String(row.username),
      passwordHash: sharedDevelopmentPasswordHash,
      fullName: String(row.fullName),
      department: row.department == null ? null : String(row.department),
      role: String(row.role),
      organizationId: organization.id,
      plantId: plant.id,
      categoryId: row.categoryId == null ? null : String(row.categoryId),
      active: Boolean(row.active),
      lastSeenAt: null,
      createdAt: asDate(row.createdAt)!,
      updatedAt: asDate(row.updatedAt)!,
    })),
  });

  const userCategoryRows = snapshot.users
    .filter((row) => row.categoryId != null)
    .map((row) => ({ userId: String(row.id), categoryId: String(row.categoryId) }));
  if (userCategoryRows.length) await target.userCategory.createMany({ data: userCategoryRows });

  const memberIds = new Set(snapshot.users.map((row) => String(row.id)));
  await target.cmWork.createMany({
    data: snapshot.works.map((row) => ({
      id: String(row.id),
      number: String(row.number),
      requesterName: String(row.requesterName),
      requesterDepartment: String(row.requesterDepartment),
      organizationId: organization.id,
      plantId: plant.id,
      categoryId: String(row.categoryId),
      zoneId: String(row.zoneId),
      machineName: String(row.machineName),
      problemTitle: String(row.problemTitle),
      problemDetail: String(row.problemDetail),
      urgency: String(row.urgency),
      status: String(row.status),
      claimantId: row.claimantId == null ? null : memberIds.has(String(row.claimantId)) ? String(row.claimantId) : siteAdmin.id,
      rootCause: row.rootCause == null ? null : String(row.rootCause),
      correctiveAction: row.correctiveAction == null ? null : String(row.correctiveAction),
      workNote: row.workNote == null ? null : String(row.workNote),
      engineerNote: row.engineerNote == null ? null : String(row.engineerNote),
      canceledReason: row.canceledReason == null ? null : String(row.canceledReason),
      releaseReason: row.releaseReason == null ? null : String(row.releaseReason),
      returnedReason: row.returnedReason == null ? null : String(row.returnedReason),
      createdAt: asDate(row.createdAt)!,
      claimedAt: asDate(row.claimedAt),
      inProgressAt: asDate(row.inProgressAt),
      waitingToCloseAt: asDate(row.waitingToCloseAt),
      closedAt: asDate(row.closedAt),
      canceledAt: asDate(row.canceledAt),
      reviewerId: row.reviewerId == null ? null : memberIds.has(String(row.reviewerId)) ? String(row.reviewerId) : siteAdmin.id,
    })),
  });

  await target.statusHistory.createMany({
    data: snapshot.statusHistory.map((row) => ({
      id: String(row.id),
      cmWorkId: String(row.cmWorkId),
      fromStatus: row.fromStatus == null ? null : String(row.fromStatus),
      toStatus: String(row.toStatus),
      changedById:
        row.changedById == null
          ? null
          : memberIds.has(String(row.changedById))
            ? String(row.changedById)
            : siteAdmin.id,
      changedAt: asDate(row.changedAt)!,
      note: row.note == null ? null : String(row.note),
    })),
  });

  if (snapshot.sequences.length) {
    await target.cmNumberSequence.createMany({
      data: snapshot.sequences.map((row) => ({
        yearMonth: String(row.yearMonth),
        lastNumber: Number(row.lastNumber),
        createdAt: asDate(row.createdAt)!,
        updatedAt: asDate(row.updatedAt)!,
      })),
    });
  }

  await target.siteAdminPermission.createMany({
    data: SITE_ADMIN_CONFIGURABLE_PERMISSIONS.map((permissionKey) => ({
      userId: siteAdmin.id,
      plantId: plant.id,
      permissionKey,
      enabled: true,
      grantedById: owner.id,
    })),
  });

  await target.organizationProfile.create({
    data: {
      id: "dev-organization-profile-mitrphol",
      organizationId: organization.id,
      companyName: organization.name,
    },
  });
  await target.plantProfile.create({
    data: {
      id: "dev-plant-profile-rungtiva",
      plantId: plant.id,
      companyName: plant.name,
    },
  });
  await target.slaSetting.create({
    data: { id: "dev-sla-rungtiva", plantId: plant.id, claimDays: 1, executionDays: 3, reviewDays: 2 },
  });
  await target.systemSetting.create({
    data: { id: "dev-system-rungtiva", plantId: plant.id, engineerWorkAssignmentEnabled: false },
  });
  await target.auditEvent.create({
    data: {
      actorId: owner.id,
      organizationId: organization.id,
      plantId: plant.id,
      entityType: "DEVELOPMENT_DATABASE",
      entityId: plant.id,
      action: "RESET_AND_SYNC_PRODUCTION_CM",
      reason: "Development-only reset requested by project owner",
    },
  });

  const counts = {
    users: await target.user.count(),
    organizations: await target.organization.count(),
    sites: await target.plant.count(),
    categories: await target.category.count(),
    zones: await target.zone.count(),
    cmWorks: await target.cmWork.count(),
    statusHistory: await target.statusHistory.count(),
    stores: await target.store.count(),
    spareParts: await target.sparePart.count(),
    stocks: await target.storeStock.count(),
    stockMovements: await target.stockMovement.count(),
    issues: await target.sparePartIssue.count(),
    receives: await target.sparePartReceive.count(),
  };

  const ownerCheck = await target.user.findUniqueOrThrow({ where: { username: owner.username } });
  const importedWorksOutsideScope = await target.cmWork.count({
    where: { OR: [{ organizationId: { not: organization.id } }, { plantId: { not: plant.id } }] },
  });
  if (ownerCheck.organizationId || ownerCheck.plantId) throw new Error("Owner must not be attached to an Organization or Site.");
  if (counts.organizations !== 1 || counts.sites !== 1) throw new Error("Development scope verification failed.");
  if (counts.cmWorks !== snapshot.works.length || counts.statusHistory !== snapshot.statusHistory.length) {
    throw new Error("CM synchronization count mismatch.");
  }
  if (importedWorksOutsideScope) throw new Error("CM scope verification failed.");
  if (counts.stores || counts.spareParts || counts.stocks || counts.stockMovements || counts.issues || counts.receives) {
    throw new Error("Inventory test data was not fully reset.");
  }

  await target.$disconnect();

  fs.rmSync(developmentDb, { force: true });
  fs.renameSync(temporaryDb, developmentDb);

  const report = {
    completedAt: new Date().toISOString(),
    environment: "development-local-sqlite",
    productionAccess: "read-only snapshot",
    productionProject: snapshot.sourceProject,
    backup: path.relative(root, backupDir),
    ownerUsername: owner.username,
    organizationAdmin: organizationAdmin.username,
    siteAdmin: siteAdmin.username,
    credentialPolicy: "Organization Admin, Site Admin, and synchronized members use DEVELOPMENT_RESET_PASSWORD supplied at runtime.",
    counts,
    notes: [
      "Production ADMIN account was not copied.",
      "Production password hashes, profile photos, and signatures were not copied.",
      "No Development password is stored in this report.",
      "Current schema has no Asset table; machine/asset labels remain in CmWork.machineName.",
    ],
  };
  fs.writeFileSync(path.join(backupDir, "RESET_REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
