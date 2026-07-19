import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const databaseUrl = process.env.DATABASE_URL?.trim().toLowerCase() ?? "";
if (!databaseUrl.startsWith("file:")) {
  throw new Error("This smoke test is restricted to the local SQLite Development database.");
}

// Keep this diagnostic isolated from real LINE destinations.
delete process.env.LINE_CHANNEL_ACCESS_TOKEN;

const { createLoggedInStoreIssue, approveStoreIssue, issueStoreStock } = await import(
  "../modules/store/store-issue-prisma"
);
const { RoleName } = await import("../modules/cm-work/cm-work-types");
const { StoreIssueStatus, StoreIssueType } = await import("../modules/store/store-types");
const { getStoreIssuePeriod } = await import("../modules/store/store-numbering");

let issueId: string | null = null;
let stockId: string | null = null;
let originalQuantity = 0;
let sequenceBefore: { id: string; lastNumber: number } | null = null;
const requestedAt = new Date();

try {
  const actor = await db.user.findFirst({
    where: { role: RoleName.ADMIN, active: true },
    select: {
      id: true,
      role: true,
      fullName: true,
      department: true,
      organizationId: true,
      plantId: true,
      siteAdminPermissions: {
        select: { userId: true, plantId: true, permissionKey: true, enabled: true },
      },
    },
  });
  if (!actor) throw new Error("No active Owner Admin account was found for the smoke test.");

  const stock = await db.storeStock.findFirst({
    where: {
      quantity: { gte: 1 },
      plant: { active: true, inventoryCode: { not: null } },
      store: { active: true },
      sparePart: {
        active: true,
        itemCode: { not: null },
        type: { active: true },
        category: { active: true },
      },
    },
    select: {
      id: true,
      organizationId: true,
      plantId: true,
      storeId: true,
      sparePartId: true,
      quantity: true,
      plant: { select: { name: true, inventoryCode: true } },
      store: { select: { name: true, code: true } },
      sparePart: { select: { name: true, code: true } },
    },
  });
  if (!stock?.plant.inventoryCode) throw new Error("No issue-ready stock row was found.");

  const zone = await db.storeApplicableZone.findFirst({
    where: {
      organizationId: stock.organizationId,
      plantId: stock.plantId,
      active: true,
      zone: { plantId: stock.plantId, active: true },
    },
    select: { zoneId: true, code: true, zone: { select: { name: true } } },
    orderBy: { code: "asc" },
  });
  if (!zone) throw new Error("No active Applicable Zone was found for the selected Site.");

  const scope = {
    organizationId: stock.organizationId,
    plantId: stock.plantId,
    plantCode: stock.plant.inventoryCode,
  };
  const { year, month } = getStoreIssuePeriod(requestedAt);
  sequenceBefore = await db.storeIssueSequence.findUnique({
    where: { plantId_year_month: { plantId: stock.plantId, year, month } },
    select: { id: true, lastNumber: true },
  });
  stockId = stock.id;
  originalQuantity = Number(stock.quantity);

  const created = await createLoggedInStoreIssue(actor, scope, {
    issueType: StoreIssueType.DIRECT,
    requesterName: "Store issue smoke test",
    requesterDepartment: "Development QA",
    note: "Temporary local smoke test. This record is removed automatically.",
    requestedAt,
    items: [
      {
        storeId: stock.storeId,
        sparePartId: stock.sparePartId,
        zoneId: zone.zoneId,
        requestedQty: 1,
      },
    ],
  });
  issueId = created.id;

  const createdIssue = await db.sparePartIssue.findUniqueOrThrow({
    where: { id: issueId },
    select: { number: true, status: true, items: { select: { id: true, lineNumber: true } } },
  });
  if (createdIssue.status !== StoreIssueStatus.WAITING_ENGINEER_APPROVAL) {
    throw new Error(`Unexpected status after create: ${createdIssue.status}`);
  }
  if (!createdIssue.items[0]?.lineNumber) throw new Error("Issue line number was not generated.");

  await approveStoreIssue(actor, scope, issueId, "APPROVE");
  const approved = await db.sparePartIssue.findUniqueOrThrow({
    where: { id: issueId },
    select: { status: true },
  });
  if (approved.status !== StoreIssueStatus.WAITING_STORE_ISSUE) {
    throw new Error(`Unexpected status after approval: ${approved.status}`);
  }

  await issueStoreStock(actor, scope, issueId, [{ itemId: createdIssue.items[0].id, quantity: 1 }]);
  const [issued, stockAfter] = await Promise.all([
    db.sparePartIssue.findUniqueOrThrow({ where: { id: issueId }, select: { status: true } }),
    db.storeStock.findUniqueOrThrow({ where: { id: stock.id }, select: { quantity: true } }),
  ]);
  if (issued.status !== StoreIssueStatus.ISSUED) throw new Error(`Unexpected final status: ${issued.status}`);
  if (Number(stockAfter.quantity) !== originalQuantity - 1) {
    throw new Error(`Stock mismatch: expected ${originalQuantity - 1}, received ${stockAfter.quantity}.`);
  }

  console.log(
    JSON.stringify(
      {
        result: "PASS",
        site: stock.plant.name,
        issueNumber: createdIssue.number,
        sparePart: `${stock.sparePart.code} ${stock.sparePart.name}`,
        store: `${stock.store.code} ${stock.store.name}`,
        applicableZone: `${zone.code} ${zone.zone.name}`,
        testedQuantity: 1,
        statuses: [
          StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
          StoreIssueStatus.WAITING_STORE_ISSUE,
          StoreIssueStatus.ISSUED,
        ],
      },
      null,
      2,
    ),
  );
} finally {
  if (issueId && stockId) {
    const { year, month } = getStoreIssuePeriod(requestedAt);
    await db.$transaction(async (tx) => {
      await tx.auditEvent.deleteMany({ where: { entityType: "SparePartIssue", entityId: issueId! } });
      await tx.stockMovement.deleteMany({ where: { refType: "SparePartIssue", refId: issueId! } });
      await tx.sparePartIssue.deleteMany({ where: { id: issueId! } });
      await tx.storeStock.update({ where: { id: stockId! }, data: { quantity: originalQuantity } });
      if (sequenceBefore) {
        await tx.storeIssueSequence.update({
          where: { id: sequenceBefore.id },
          data: { lastNumber: sequenceBefore.lastNumber },
        });
      } else {
        await tx.storeIssueSequence.deleteMany({
          where: { plantId: (await tx.storeStock.findUniqueOrThrow({ where: { id: stockId! } })).plantId, year, month },
        });
      }
    });
  }
  await db.$disconnect();
}
