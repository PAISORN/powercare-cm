import {
  StockMovementType,
  StoreIssueStatus,
  type StoreIssueType,
  type StoreScope,
} from "./store-types";
import { canIssueRequestedQuantity } from "./store-scope";

export type StoreIssueActor = {
  id: string;
  role: string;
  plantId?: string | null;
};

export type StoreIssueItemInput = {
  sparePartId: string;
  storeId?: string | null;
  zoneId: string;
  zoneCode?: string | null;
  lineNumber?: string;
  requestedQty: number;
  note?: string | null;
};

export type CreateStoreIssueInput = {
  number: string;
  issueType: StoreIssueType;
  cmWorkId?: string | null;
  requesterName: string;
  requesterDepartment?: string | null;
  requesterContact?: string | null;
  requesterUserId?: string | null;
  note?: string | null;
  requestedAt: Date;
  items: StoreIssueItemInput[];
};

export type StoreIssueRecord = {
  id: string;
  status: string;
  plantId: string;
  organizationId: string;
  items: {
    id: string;
    lineNumber?: string | null;
    storeId: string | null;
    sparePartId: string;
    zoneId?: string | null;
    zoneCode?: string | null;
    requestedQty: number;
    approvedQty?: number | null;
    issuedQty?: number | null;
  }[];
};

export type StoreIssueRepository = {
  createIssue(input: CreateStoreIssueInput & { scope: StoreScope; status: string }): Promise<{ id: string }>;
  readIssue(issueId: string): Promise<StoreIssueRecord | null>;
  updateIssueStatus(input: {
    issueId: string;
    status: string;
    actorId: string;
    reason?: string | null;
    changedAt: Date;
  }): Promise<void>;
  updateIssueItem(input: {
    itemId: string;
    approvedQty?: number;
    issuedQty?: number;
    status?: string;
  }): Promise<void>;
  readAvailableStock(input: { storeId: string; sparePartId: string }): Promise<number>;
  addStock(input: {
    scope: StoreScope;
    storeId: string;
    sparePartId: string;
    quantity: number;
  }): Promise<{ balanceAfter: number }>;
  createMovement(input: {
    scope: StoreScope;
    storeId: string;
    sparePartId: string;
    actorId: string;
    movementType: string;
    refType?: string;
    refId?: string;
    quantityChange: number;
    balanceAfter?: number;
    occurredAt: Date;
  }): Promise<void>;
};

export async function createStoreIssueWithRepository(
  repository: StoreIssueRepository,
  scope: StoreScope,
  input: CreateStoreIssueInput,
) {
  assertIssueInput(input);
  const requestedByStock = new Map<string, { storeId: string; sparePartId: string; requestedQty: number }>();
  for (const item of input.items) {
    if (!item.storeId) throw new Error("Store is required for every issue item.");
    const key = `${item.storeId}:${item.sparePartId}`;
    const current = requestedByStock.get(key);
    requestedByStock.set(key, {
      storeId: item.storeId,
      sparePartId: item.sparePartId,
      requestedQty: (current?.requestedQty ?? 0) + item.requestedQty,
    });
  }
  for (const item of requestedByStock.values()) {
    const available = await repository.readAvailableStock({
      storeId: item.storeId,
      sparePartId: item.sparePartId,
    });
    if (!canIssueRequestedQuantity(available, item.requestedQty)) {
      throw new Error("Requested quantity exceeds available stock.");
    }
  }
  return repository.createIssue({
    ...input,
    scope,
    status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
  });
}

export async function approveStoreIssueByEngineer(
  repository: Pick<StoreIssueRepository, "readIssue" | "updateIssueStatus" | "updateIssueItem">,
  engineer: StoreIssueActor,
  scope: StoreScope,
  issueId: string,
  changedAt = new Date(),
) {
  const issue = await readIssueInScope(repository, scope, issueId);
  assertActorInScope(engineer, scope);
  assertIssueStatus(issue, StoreIssueStatus.WAITING_ENGINEER_APPROVAL);
  for (const item of issue.items) {
    await repository.updateIssueItem({
      itemId: item.id,
      approvedQty: item.requestedQty,
      status: "APPROVED",
    });
  }
  await repository.updateIssueStatus({
    issueId,
    status: StoreIssueStatus.WAITING_STORE_ISSUE,
    actorId: engineer.id,
    changedAt,
  });
}

export async function returnStoreIssueForEdit(
  repository: Pick<StoreIssueRepository, "readIssue" | "updateIssueStatus">,
  engineer: StoreIssueActor,
  scope: StoreScope,
  issueId: string,
  reason: string,
  changedAt = new Date(),
) {
  const issue = await readIssueInScope(repository, scope, issueId);
  assertActorInScope(engineer, scope);
  assertIssueStatus(issue, StoreIssueStatus.WAITING_ENGINEER_APPROVAL);
  assertReason(reason);
  await repository.updateIssueStatus({
    issueId,
    status: StoreIssueStatus.RETURNED_FOR_EDIT,
    actorId: engineer.id,
    reason: reason.trim(),
    changedAt,
  });
}

export async function rejectStoreIssueByEngineer(
  repository: Pick<StoreIssueRepository, "readIssue" | "updateIssueStatus">,
  engineer: StoreIssueActor,
  scope: StoreScope,
  issueId: string,
  reason: string,
  changedAt = new Date(),
) {
  const issue = await readIssueInScope(repository, scope, issueId);
  assertActorInScope(engineer, scope);
  assertIssueStatus(issue, StoreIssueStatus.WAITING_ENGINEER_APPROVAL);
  assertReason(reason);
  await repository.updateIssueStatus({
    issueId,
    status: StoreIssueStatus.ENGINEER_REJECTED,
    actorId: engineer.id,
    reason: reason.trim(),
    changedAt,
  });
}

export async function issueApprovedStoreIssue(
  repository: StoreIssueRepository,
  storeOfficer: StoreIssueActor,
  scope: StoreScope,
  issueId: string,
  issuedAt = new Date(),
) {
  const issue = await readIssueInScope(repository, scope, issueId);
  return issueStoreIssueQuantities(
    repository,
    storeOfficer,
    scope,
    issueId,
    issue.items.map((item) => ({
      itemId: item.id,
      quantity: (item.approvedQty ?? item.requestedQty) - (item.issuedQty ?? 0),
    })),
    issuedAt,
  );
}

export async function issueStoreIssueQuantities(
  repository: StoreIssueRepository,
  storeOfficer: StoreIssueActor,
  scope: StoreScope,
  issueId: string,
  quantities: Array<{ itemId: string; quantity: number }>,
  issuedAt = new Date(),
) {
  const issue = await readIssueInScope(repository, scope, issueId);
  assertActorInScope(storeOfficer, scope);
  if (
    issue.status !== StoreIssueStatus.WAITING_STORE_ISSUE &&
    issue.status !== StoreIssueStatus.PARTIALLY_ISSUED
  ) {
    throw new Error(`Store issue must be ${StoreIssueStatus.WAITING_STORE_ISSUE} or ${StoreIssueStatus.PARTIALLY_ISSUED}.`);
  }
  const requestedByItem = new Map(quantities.map((entry) => [entry.itemId, entry.quantity]));
  const issuedBeforeByItem = new Map(issue.items.map((item) => [item.id, item.issuedQty ?? 0]));
  const selected = issue.items.filter((item) => (requestedByItem.get(item.id) ?? 0) > 0);
  if (!selected.length) throw new Error("Issue quantity must be greater than zero.");

  for (const item of selected) {
    const issueQuantity = requestedByItem.get(item.id) ?? 0;
    const remaining = (item.approvedQty ?? item.requestedQty) - (item.issuedQty ?? 0);
    if (!Number.isInteger(issueQuantity) || issueQuantity <= 0 || issueQuantity > remaining) {
      throw new Error("Issue quantity exceeds the approved remaining quantity.");
    }
    if (!item.storeId) {
      throw new Error("Store is required before issue.");
    }
    const available = await repository.readAvailableStock({
      storeId: item.storeId,
      sparePartId: item.sparePartId,
    });
    if (!canIssueRequestedQuantity(available, issueQuantity)) {
      await markStoreIssueNotEnoughStock(repository, storeOfficer, scope, issueId, "Not enough stock.", issuedAt);
      return { status: StoreIssueStatus.NOT_ENOUGH_STOCK };
    }
  }

  for (const item of selected) {
    const issueQuantity = requestedByItem.get(item.id) as number;
    const storeId = item.storeId as string;
    const stock = await repository.addStock({
      scope,
      storeId,
      sparePartId: item.sparePartId,
      quantity: -issueQuantity,
    });
    await repository.createMovement({
      scope,
      storeId,
      sparePartId: item.sparePartId,
      actorId: storeOfficer.id,
      movementType: StockMovementType.ISSUE,
      refType: "SparePartIssue",
      refId: issueId,
      quantityChange: -issueQuantity,
      balanceAfter: stock.balanceAfter,
      occurredAt: issuedAt,
    });
    const issuedQty = (issuedBeforeByItem.get(item.id) ?? 0) + issueQuantity;
    const approvedQty = item.approvedQty ?? item.requestedQty;
    await repository.updateIssueItem({
      itemId: item.id,
      issuedQty,
      status: issuedQty >= approvedQty ? "ISSUED" : "PARTIALLY_ISSUED",
    });
  }

  const allIssued = issue.items.every((item) => {
    const newlyIssued = requestedByItem.get(item.id) ?? 0;
    return (issuedBeforeByItem.get(item.id) ?? 0) + newlyIssued >= (item.approvedQty ?? item.requestedQty);
  });
  const nextStatus = allIssued ? StoreIssueStatus.ISSUED : StoreIssueStatus.PARTIALLY_ISSUED;
  await repository.updateIssueStatus({
    issueId,
    status: nextStatus,
    actorId: storeOfficer.id,
    changedAt: issuedAt,
  });
  return { status: nextStatus };
}

export async function markStoreIssueNotEnoughStock(
  repository: Pick<StoreIssueRepository, "readIssue" | "updateIssueStatus">,
  actor: StoreIssueActor,
  scope: StoreScope,
  issueId: string,
  reason: string,
  changedAt: Date,
) {
  const issue = await readIssueInScope(repository, scope, issueId);
  assertActorInScope(actor, scope);
  if (
    issue.status !== StoreIssueStatus.WAITING_STORE_ISSUE &&
    issue.status !== StoreIssueStatus.PARTIALLY_ISSUED
  ) throw new Error("Store issue is not waiting for Store action.");
  assertReason(reason);
  await repository.updateIssueStatus({
    issueId,
    status: StoreIssueStatus.NOT_ENOUGH_STOCK,
    actorId: actor.id,
    reason: reason.trim(),
    changedAt,
  });
}

export async function cancelStoreIssueWithRepository(
  repository: Pick<StoreIssueRepository, "readIssue" | "updateIssueStatus" | "updateIssueItem">,
  actor: StoreIssueActor,
  scope: StoreScope,
  issueId: string,
  reason: string,
  changedAt = new Date(),
) {
  const issue = await readIssueInScope(repository, scope, issueId);
  assertActorInScope(actor, scope);
  assertReason(reason);

  if (issue.items.some((item) => (item.issuedQty ?? 0) > 0)) {
    throw new Error("A Store issue cannot be canceled after stock has been issued.");
  }

  const engineerStatuses = [
    StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
    StoreIssueStatus.RETURNED_FOR_EDIT,
    StoreIssueStatus.WAITING_STORE_ISSUE,
    StoreIssueStatus.NOT_ENOUGH_STOCK,
  ];
  const storeOfficerStatuses = [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.NOT_ENOUGH_STOCK];
  const ownerStatuses = [...new Set([...engineerStatuses, ...storeOfficerStatuses])];
  const allowedStatuses =
    actor.role === "ENGINEER"
      ? engineerStatuses
      : actor.role === "STORE_OFFICER"
        ? storeOfficerStatuses
        : actor.role === "ADMIN"
          ? ownerStatuses
          : [];

  if (!allowedStatuses.includes(issue.status as never)) {
    throw new Error("This role cannot cancel the Store issue at its current status.");
  }

  for (const item of issue.items) {
    await repository.updateIssueItem({ itemId: item.id, status: StoreIssueStatus.CANCELED });
  }
  await repository.updateIssueStatus({
    issueId,
    status: StoreIssueStatus.CANCELED,
    actorId: actor.id,
    reason: reason.trim(),
    changedAt,
  });
}

async function readIssueInScope(
  repository: Pick<StoreIssueRepository, "readIssue">,
  scope: StoreScope,
  issueId: string,
) {
  const issue = await repository.readIssue(issueId);
  if (!issue) throw new Error("Store issue was not found.");
  if (issue.organizationId !== scope.organizationId || issue.plantId !== scope.plantId) {
    throw new Error("Store issue is outside the selected site scope.");
  }
  return issue;
}

function assertIssueInput(input: CreateStoreIssueInput) {
  if (!input.requesterName.trim()) throw new Error("Requester name is required.");
  if (!input.items.length) throw new Error("Store issue must include at least one item.");
  for (const item of input.items) {
    if (!item.zoneId.trim()) throw new Error("Applicable Zone is required for every spare part.");
    if (!Number.isInteger(item.requestedQty) || item.requestedQty <= 0) {
      throw new Error("Requested quantity must be a positive whole number.");
    }
  }
}

function assertReason(reason: string) {
  if (!reason.trim()) throw new Error("Reason is required.");
}

function assertIssueStatus(issue: StoreIssueRecord, expectedStatus: string) {
  if (issue.status !== expectedStatus) {
    throw new Error(`Store issue must be ${expectedStatus}.`);
  }
}

function assertActorInScope(actor: StoreIssueActor, scope: StoreScope) {
  if (actor.plantId && actor.plantId !== scope.plantId) {
    throw new Error("Actor is outside the selected site scope.");
  }
}
