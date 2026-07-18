import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import {
  canUseUserPermission,
  PermissionKey,
  type PermissionUserContext,
} from "../auth/site-admin-permissions";
import { dispatchLineStoreEvent } from "../line/line-service";
import type { LineEventType } from "../line/line-types";
import {
  approveStoreIssueByEngineer,
  createStoreIssueWithRepository,
  issueStoreIssueQuantities,
  markStoreIssueNotEnoughStock,
  rejectStoreIssueByEngineer,
  returnStoreIssueForEdit,
  type StoreIssueItemInput,
  type StoreIssueRepository,
} from "./store-issue-service";
import {
  formatSparePartIssueLineNumber,
  formatSparePartIssueNumber,
  getStoreIssuePeriod,
} from "./store-numbering";
import { assertActorStoreScope, requireStorePermission } from "./store-prisma-service";
import { StoreIssueStatus, StoreIssueType, type StoreScope } from "./store-types";

type StoreActor = PermissionUserContext & { id: string; fullName?: string; department?: string | null };

export type CreateLoggedInStoreIssueInput = {
  issueType: string;
  cmWorkNumber?: string | null;
  requesterName: string;
  requesterDepartment?: string | null;
  requesterContact?: string | null;
  note?: string | null;
  requestedAt: Date;
  items: StoreIssueItemInput[];
};

export async function createLoggedInStoreIssue(
  actor: StoreActor,
  scope: StoreScope,
  input: CreateLoggedInStoreIssueInput,
) {
  requireStorePermission(actor, PermissionKey.CREATE_STORE_ISSUE);
  assertActorStoreScope(actor, scope);
  const issueType = normalizeIssueType(input.issueType);

  const created = await db.$transaction(async (tx) => {
    const plant = await tx.plant.findFirstOrThrow({
      where: { id: scope.plantId, organizationId: scope.organizationId, active: true },
      select: { id: true, inventoryCode: true },
    });
    if (!plant.inventoryCode) throw new Error("Store Site code must be configured before creating an issue.");
    const cmWorkId = await resolveCmWorkId(tx, scope, issueType, input.cmWorkNumber);
    await assertIssueItemsInScope(tx, scope, input.items);
    const items = await reserveIssueLineNumbers(tx, scope, plant.inventoryCode, input.items);
    const { year, month } = getStoreIssuePeriod(input.requestedAt);
    const sequence = await tx.storeIssueSequence.upsert({
      where: { plantId_year_month: { plantId: scope.plantId, year, month } },
      update: { lastNumber: { increment: 1 } },
      create: { plantId: scope.plantId, year, month, lastNumber: 1 },
      select: { lastNumber: true },
    });
    const number = formatSparePartIssueNumber(plant.inventoryCode, input.requestedAt, sequence.lastNumber);
    const repository = createIssueRepository(tx);
    const created = await createStoreIssueWithRepository(repository, scope, {
      number,
      issueType,
      cmWorkId,
      requesterName: requiredText(input.requesterName, "Requester name"),
      requesterDepartment: optionalText(input.requesterDepartment ?? actor.department),
      requesterContact: optionalText(input.requesterContact),
      requesterUserId: actor.id,
      note: optionalText(input.note),
      requestedAt: input.requestedAt,
      items,
    });
    await writeAudit(tx, actor.id, scope, created.id, "CREATE_STORE_ISSUE", {
      number,
      issueType,
      itemCount: input.items.length,
    });
    return { ...created, number };
  });
  await dispatchStoreIssueLineEvent(created.id, "STORE_ISSUE_CREATED", actor.fullName);
  return created;
}

export async function createPublicStoreIssue(
  inventoryCode: string,
  input: Omit<CreateLoggedInStoreIssueInput, "requesterName"> & {
    requesterName: string;
    requesterDepartment: string;
    requesterContact?: string | null;
  },
) {
  const created = await db.$transaction(async (tx) => {
    const plant = await tx.plant.findFirst({
      where: {
        inventoryCode: inventoryCode.trim().toUpperCase(),
        active: true,
        publicStoreIssueEnabled: true,
      },
      select: {
        id: true,
        organizationId: true,
        inventoryCode: true,
        publicStoreIssueContactRequired: true,
      },
    });
    if (!plant?.inventoryCode) throw new Error("Public Store Issue is not available for this Site.");
    const requesterContact = optionalText(input.requesterContact);
    if (plant.publicStoreIssueContactRequired && !requesterContact) {
      throw new Error("Contact is required for this Site.");
    }
    const scope: StoreScope = {
      organizationId: plant.organizationId,
      plantId: plant.id,
      plantCode: plant.inventoryCode,
    };
    const issueType = normalizeIssueType(input.issueType);
    const cmWorkId = await resolveCmWorkId(tx, scope, issueType, input.cmWorkNumber);
    await assertIssueItemsInScope(tx, scope, input.items);
    const items = await reserveIssueLineNumbers(tx, scope, plant.inventoryCode, input.items);
    const { year, month } = getStoreIssuePeriod(input.requestedAt);
    const sequence = await tx.storeIssueSequence.upsert({
      where: { plantId_year_month: { plantId: scope.plantId, year, month } },
      update: { lastNumber: { increment: 1 } },
      create: { plantId: scope.plantId, year, month, lastNumber: 1 },
      select: { lastNumber: true },
    });
    const number = formatSparePartIssueNumber(plant.inventoryCode, input.requestedAt, sequence.lastNumber);
    const repository = createIssueRepository(tx);
    const created = await createStoreIssueWithRepository(repository, scope, {
      number,
      issueType,
      cmWorkId,
      requesterName: requiredText(input.requesterName, "Requester name"),
      requesterDepartment: requiredText(input.requesterDepartment, "Requester department"),
      requesterContact,
      requesterUserId: null,
      note: optionalText(input.note),
      requestedAt: input.requestedAt,
      items,
    });
    await writeAudit(tx, undefined, scope, created.id, "CREATE_PUBLIC_STORE_ISSUE", {
      number,
      issueType,
      itemCount: input.items.length,
    });
    return { ...created, number, plantId: scope.plantId };
  });
  await dispatchStoreIssueLineEvent(created.id, "STORE_ISSUE_CREATED", input.requesterName);
  return created;
}

export async function approveStoreIssue(
  actor: StoreActor,
  scope: StoreScope,
  issueId: string,
  decision: "APPROVE" | "REJECT" | "RETURN",
  reason?: string | null,
) {
  requireStorePermission(actor, PermissionKey.APPROVE_STORE_ISSUE);
  assertActorStoreScope(actor, scope);
  await db.$transaction(async (tx) => {
    const repository = createIssueRepository(tx);
    if (decision === "APPROVE") {
      await approveStoreIssueByEngineer(repository, actor, scope, issueId);
    } else if (decision === "RETURN") {
      await returnStoreIssueForEdit(repository, actor, scope, issueId, reason ?? "");
    } else {
      await rejectStoreIssueByEngineer(repository, actor, scope, issueId, reason ?? "");
    }
    await writeAudit(tx, actor.id, scope, issueId, `STORE_ISSUE_${decision}`, { reason: optionalText(reason) });
  });
  await dispatchStoreIssueLineEvent(
    issueId,
    decision === "APPROVE" ? "STORE_ISSUE_APPROVED" : "STORE_ISSUE_REJECTED",
    actor.fullName,
  );
}

export async function issueStoreStock(
  actor: StoreActor,
  scope: StoreScope,
  issueId: string,
  quantities: Array<{ itemId: string; quantity: number }>,
) {
  requireStorePermission(actor, PermissionKey.ISSUE_STOCK);
  assertActorStoreScope(actor, scope);
  const result = await db.$transaction(async (tx) => {
    const repository = createIssueRepository(tx);
    const result = await issueStoreIssueQuantities(repository, actor, scope, issueId, quantities);
    await writeAudit(tx, actor.id, scope, issueId, "ISSUE_STORE_STOCK", { quantities, status: result.status });
    return result;
  });
  await dispatchStoreIssueLineEvent(
    issueId,
    result.status === StoreIssueStatus.NOT_ENOUGH_STOCK ? "STORE_NOT_ENOUGH_STOCK" : "STORE_ISSUE_ISSUED",
    actor.fullName,
  );
  return result;
}

export async function markIssueNotEnoughStock(
  actor: StoreActor,
  scope: StoreScope,
  issueId: string,
  reason: string,
) {
  requireStorePermission(actor, PermissionKey.ISSUE_STOCK);
  assertActorStoreScope(actor, scope);
  await db.$transaction(async (tx) => {
    const repository = createIssueRepository(tx);
    await markStoreIssueNotEnoughStock(repository, actor, scope, issueId, reason, new Date());
    await writeAudit(tx, actor.id, scope, issueId, "STORE_ISSUE_NOT_ENOUGH_STOCK", { reason: reason.trim() });
  });
  await dispatchStoreIssueLineEvent(issueId, "STORE_NOT_ENOUGH_STOCK", actor.fullName);
}

function createIssueRepository(tx: Prisma.TransactionClient): StoreIssueRepository {
  return {
    async createIssue(input) {
      return tx.sparePartIssue.create({
        data: {
          number: input.number,
          organizationId: input.scope.organizationId,
          plantId: input.scope.plantId,
          cmWorkId: input.cmWorkId,
          issueType: input.issueType,
          status: input.status,
          requesterName: input.requesterName,
          requesterDepartment: input.requesterDepartment,
          requesterContact: input.requesterContact,
          requesterUserId: input.requesterUserId,
          note: input.note,
          requestedAt: input.requestedAt,
          items: {
            create: input.items.map((item) => ({
              lineNumber: item.lineNumber,
              storeId: item.storeId,
              sparePartId: item.sparePartId,
              zoneId: item.zoneId,
              zoneCode: item.zoneCode,
              requestedQty: item.requestedQty,
              note: optionalText(item.note),
            })),
          },
        },
        select: { id: true },
      });
    },
    async readIssue(issueId) {
      const issue = await tx.sparePartIssue.findUnique({
        where: { id: issueId },
        select: {
          id: true,
          status: true,
          plantId: true,
          organizationId: true,
          items: {
            select: {
              id: true,
              lineNumber: true,
              storeId: true,
              sparePartId: true,
              zoneId: true,
              zoneCode: true,
              requestedQty: true,
              approvedQty: true,
              issuedQty: true,
            },
          },
        },
      });
      return issue
        ? {
            ...issue,
            items: issue.items.map((item) => ({
              ...item,
              requestedQty: Number(item.requestedQty),
              approvedQty: item.approvedQty == null ? null : Number(item.approvedQty),
              issuedQty: item.issuedQty == null ? null : Number(item.issuedQty),
            })),
          }
        : null;
    },
    async updateIssueStatus(input) {
      const isEngineerAction = [
        StoreIssueStatus.WAITING_STORE_ISSUE,
        StoreIssueStatus.ENGINEER_REJECTED,
        StoreIssueStatus.RETURNED_FOR_EDIT,
      ].includes(input.status as never);
      const isStoreAction = [
        StoreIssueStatus.PARTIALLY_ISSUED,
        StoreIssueStatus.ISSUED,
        StoreIssueStatus.NOT_ENOUGH_STOCK,
        StoreIssueStatus.STORE_REJECTED,
      ].includes(input.status as never);
      await tx.sparePartIssue.update({
        where: { id: input.issueId },
        data: {
          status: input.status,
          rejectReason: input.reason ?? null,
          ...(isEngineerAction ? { engineerId: input.actorId } : {}),
          ...(input.status === StoreIssueStatus.WAITING_STORE_ISSUE
            ? { engineerApprovedAt: input.changedAt, rejectedAt: null }
            : {}),
          ...(input.status === StoreIssueStatus.ENGINEER_REJECTED
            ? { rejectedAt: input.changedAt }
            : {}),
          ...(isStoreAction ? { storeOfficerId: input.actorId } : {}),
          ...(input.status === StoreIssueStatus.ISSUED ? { issuedAt: input.changedAt } : {}),
          ...(input.status === StoreIssueStatus.NOT_ENOUGH_STOCK ||
          input.status === StoreIssueStatus.STORE_REJECTED
            ? { rejectedAt: input.changedAt }
            : {}),
        },
      });
    },
    async updateIssueItem(input) {
      await tx.sparePartIssueItem.update({
        where: { id: input.itemId },
        data: {
          ...(input.approvedQty !== undefined ? { approvedQty: input.approvedQty } : {}),
          ...(input.issuedQty !== undefined ? { issuedQty: input.issuedQty } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });
    },
    async readAvailableStock(input) {
      const stock = await tx.storeStock.findUnique({
        where: {
          storeId_sparePartId: {
            storeId: input.storeId,
            sparePartId: input.sparePartId,
          },
        },
        select: { quantity: true },
      });
      return Number(stock?.quantity ?? 0);
    },
    async addStock(input) {
      if (input.quantity >= 0) throw new Error("Store issue must decrease stock.");
      const updated = await tx.storeStock.updateMany({
        where: {
          storeId: input.storeId,
          sparePartId: input.sparePartId,
          plantId: input.scope.plantId,
          quantity: { gte: Math.abs(input.quantity) },
        },
        data: { quantity: { increment: input.quantity } },
      });
      if (updated.count !== 1) throw new Error("Not enough stock.");
      const stock = await tx.storeStock.findUniqueOrThrow({
        where: {
          storeId_sparePartId: {
            storeId: input.storeId,
            sparePartId: input.sparePartId,
          },
        },
        select: { quantity: true },
      });
      return { balanceAfter: Number(stock.quantity) };
    },
    async createMovement(input) {
      const sparePart = await tx.sparePart.findUniqueOrThrow({
        where: { id: input.sparePartId },
        select: { latestUnitPrice: true },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: input.scope.organizationId,
          plantId: input.scope.plantId,
          storeId: input.storeId,
          sparePartId: input.sparePartId,
          actorId: input.actorId,
          movementType: input.movementType,
          refType: input.refType,
          refId: input.refId,
          quantityChange: input.quantityChange,
          balanceAfter: input.balanceAfter,
          unitPrice: sparePart.latestUnitPrice,
          occurredAt: input.occurredAt,
        },
      });
    },
  };
}

async function resolveCmWorkId(
  tx: Prisma.TransactionClient,
  scope: StoreScope,
  issueType: StoreIssueType,
  cmWorkNumber?: string | null,
) {
  if (issueType === StoreIssueType.DIRECT) return null;
  const number = requiredText(cmWorkNumber ?? "", "CM number");
  const work = await tx.cmWork.findFirst({
    where: { number, plantId: scope.plantId, organizationId: scope.organizationId },
    select: { id: true },
  });
  if (!work) throw new Error("CM number was not found in the selected Site.");
  return work.id;
}

async function assertIssueItemsInScope(
  tx: Prisma.TransactionClient,
  scope: StoreScope,
  items: StoreIssueItemInput[],
) {
  const storeIds = [...new Set(items.map((item) => item.storeId).filter(Boolean) as string[])];
  const sparePartIds = [...new Set(items.map((item) => item.sparePartId))];
  const zoneIds = [...new Set(items.map((item) => item.zoneId).filter(Boolean) as string[])];
  const stockPairs = [...new Set(items.map((item) => `${item.storeId ?? ""}:${item.sparePartId}`))];
  const [stockRows, applicableCount] = await Promise.all([
    tx.storeStock.findMany({
      where: {
        plantId: scope.plantId,
        OR: items
          .filter((item): item is StoreIssueItemInput & { storeId: string } => Boolean(item.storeId))
          .map((item) => ({ storeId: item.storeId, sparePartId: item.sparePartId })),
        store: { plantId: scope.plantId, active: true },
        sparePart: { plantId: scope.plantId, active: true },
      },
      select: { storeId: true, sparePartId: true },
    }),
    tx.storeApplicableZone.count({
      where: {
        plantId: scope.plantId,
        zoneId: { in: zoneIds },
        active: true,
        zone: { plantId: scope.plantId, active: true },
      },
    }),
  ]);
  if (!items.length || sparePartIds.length === 0) throw new Error("At least one spare part is required.");
  if (items.some((item) => !item.storeId) || storeIds.length === 0) {
    throw new Error("Store is required for every spare part.");
  }
  if (stockRows.length !== stockPairs.length) {
    throw new Error("Selected spare part is not available in the selected Store for this Site.");
  }
  if (items.some((item) => !item.zoneId)) {
    throw new Error("Applicable Zone is required for every spare part.");
  }
  if (applicableCount !== zoneIds.length) {
    throw new Error("Selected Applicable Zone is not available for this Site.");
  }
}

async function reserveIssueLineNumbers(
  tx: Prisma.TransactionClient,
  scope: StoreScope,
  siteCode: string,
  items: StoreIssueItemInput[],
) {
  const sparePartIds = [...new Set(items.map((item) => item.sparePartId))];
  const storeIds = [...new Set(items.map((item) => item.storeId).filter(Boolean) as string[])];
  const zoneIds = [...new Set(items.map((item) => item.zoneId).filter(Boolean) as string[])];
  const [spareParts, stores, applicableZones] = await Promise.all([
    tx.sparePart.findMany({
      where: { id: { in: sparePartIds }, plantId: scope.plantId, active: true },
      select: {
        id: true,
        itemCode: true,
        type: { select: { code: true, active: true } },
        category: { select: { code: true, active: true } },
      },
    }),
    tx.store.findMany({
      where: { id: { in: storeIds }, plantId: scope.plantId, active: true },
      select: { id: true, code: true },
    }),
    tx.storeApplicableZone.findMany({
      where: {
        plantId: scope.plantId,
        zoneId: { in: zoneIds },
        active: true,
        zone: { plantId: scope.plantId, active: true },
      },
      select: { zoneId: true, code: true },
    }),
  ]);
  const partById = new Map(spareParts.map((part) => [part.id, part]));
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const applicableZoneByZoneId = new Map(applicableZones.map((assignment) => [assignment.zoneId, assignment]));

  const numberedItems: StoreIssueItemInput[] = [];
  for (const item of items) {
    const part = partById.get(item.sparePartId);
    const store = item.storeId ? storeById.get(item.storeId) : null;
    const applicableZone = item.zoneId ? applicableZoneByZoneId.get(item.zoneId) : null;
    if (
      !part?.itemCode ||
      !part.type?.active ||
      !part.type.code ||
      !part.category?.active ||
      !part.category.code ||
      !applicableZone?.code ||
      !store
    ) {
      throw new Error(
        "Spare part issue numbering requires an active Store, Type, Category, Applicable Zone code, and Item Code.",
      );
    }
    numberedItems.push({
      ...item,
      zoneCode: applicableZone.code,
      lineNumber: formatSparePartIssueLineNumber({
        siteCode,
        storeCode: store.code,
        typeCode: part.type.code,
        categoryCode: part.category.code,
        zoneCode: applicableZone.code,
        itemCode: part.itemCode,
      }),
    });
  }
  return numberedItems;
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  actorId: string | undefined,
  scope: StoreScope,
  issueId: string,
  action: string,
  after: unknown,
) {
  await tx.auditEvent.create({
    data: {
      actorId,
      organizationId: scope.organizationId,
      plantId: scope.plantId,
      entityType: "SparePartIssue",
      entityId: issueId,
      action,
      afterJson: JSON.stringify(after),
    },
  });
}

function normalizeIssueType(value: string): StoreIssueType {
  if (value === StoreIssueType.CM_REFERENCED || value === StoreIssueType.DIRECT) return value;
  throw new Error("Store issue type is invalid.");
}

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function optionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

async function dispatchStoreIssueLineEvent(
  issueId: string,
  eventType: Extract<
    LineEventType,
    | "STORE_ISSUE_CREATED"
    | "STORE_ISSUE_APPROVED"
    | "STORE_ISSUE_REJECTED"
    | "STORE_ISSUE_ISSUED"
    | "STORE_NOT_ENOUGH_STOCK"
  >,
  actorName?: string | null,
) {
  const issue = await db.sparePartIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      number: true,
      status: true,
      organizationId: true,
      plantId: true,
      requesterName: true,
      plant: { select: { name: true, inventoryCode: true } },
      items: {
        select: {
          sparePart: { select: { name: true, categoryId: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!issue) return;

  await dispatchLineStoreEvent({
    eventId: `store:${issue.id}:${eventType}:${Date.now()}`,
    eventType,
    organizationId: issue.organizationId,
    plantId: issue.plantId,
    categoryId: issue.items[0]?.sparePart.categoryId ?? null,
    issueId: issue.id,
    issueNumber: issue.number,
    statusLabel: storeIssueStatusLabel(issue.status),
    requesterName: issue.requesterName,
    siteName: issue.plant.name || issue.plant.inventoryCode || "-",
    itemCount: issue.items.length,
    itemSummary: summarizeStoreIssueItems(issue.items.map((item) => item.sparePart.name)),
    actorName,
  });
}

function summarizeStoreIssueItems(names: string[]) {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (uniqueNames.length <= 3) return uniqueNames.join(", ");
  return `${uniqueNames.slice(0, 3).join(", ")} +${uniqueNames.length - 3}`;
}

function storeIssueStatusLabel(status: string) {
  if (status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL) return "รอ Engineer อนุมัติ";
  if (status === StoreIssueStatus.WAITING_STORE_ISSUE) return "รอ Store จ่าย";
  if (status === StoreIssueStatus.RETURNED_FOR_EDIT) return "ส่งกลับให้แก้ไข";
  if (status === StoreIssueStatus.ENGINEER_REJECTED) return "Engineer ไม่อนุมัติ";
  if (status === StoreIssueStatus.STORE_REJECTED) return "Store ไม่อนุมัติ";
  if (status === StoreIssueStatus.NOT_ENOUGH_STOCK) return "ของไม่พอ";
  if (status === StoreIssueStatus.PARTIALLY_ISSUED) return "จ่ายบางส่วน";
  if (status === StoreIssueStatus.ISSUED) return "จ่ายของแล้ว";
  if (status === StoreIssueStatus.CANCELED) return "ยกเลิก";
  return status;
}
