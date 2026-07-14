import { StockMovementType, SparePartReceiveStatus, type StoreScope } from "./store-types";

export type StoreActor = {
  id: string;
  role: string;
  plantId?: string | null;
};

export type ReceiveStockItemInput = {
  storeId: string;
  sparePartId: string;
  quantity: number;
  unitPrice?: number | null;
  note?: string | null;
};

export type ReceiveStockInput = {
  number: string;
  supplierName?: string | null;
  referenceNo?: string | null;
  note?: string | null;
  receivedAt: Date;
  items: ReceiveStockItemInput[];
};

export type AdjustStockInput = {
  storeId: string;
  sparePartId: string;
  quantityChange: number;
  note?: string | null;
  occurredAt: Date;
};

export type StoreReceiveRepository = {
  createReceive(input: {
    number: string;
    scope: StoreScope;
    actorId: string;
    supplierName?: string | null;
    referenceNo?: string | null;
    note?: string | null;
    status: string;
    receivedAt: Date;
    items: ReceiveStockItemInput[];
  }): Promise<{ id: string }>;
  addStock(input: {
    scope: StoreScope;
    storeId: string;
    sparePartId: string;
    quantity: number;
  }): Promise<{ balanceAfter: number }>;
  getStockBalance(input: {
    scope: StoreScope;
    storeId: string;
    sparePartId: string;
  }): Promise<number>;
  updateLatestUnitPrice(input: {
    sparePartId: string;
    unitPrice: number;
  }): Promise<void>;
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
    unitPrice?: number | null;
    note?: string | null;
    occurredAt: Date;
  }): Promise<void>;
};

export async function receiveStockWithRepository(
  repository: StoreReceiveRepository,
  actor: StoreActor,
  scope: StoreScope,
  input: ReceiveStockInput,
) {
  assertActorInScope(actor, scope);
  assertReceiveInput(input);

  const receive = await repository.createReceive({
    number: input.number,
    scope,
    actorId: actor.id,
    supplierName: input.supplierName,
    referenceNo: input.referenceNo,
    note: input.note,
    status: SparePartReceiveStatus.RECEIVED,
    receivedAt: input.receivedAt,
    items: input.items,
  });

  for (const item of input.items) {
    const stock = await repository.addStock({
      scope,
      storeId: item.storeId,
      sparePartId: item.sparePartId,
      quantity: item.quantity,
    });
    if (item.unitPrice != null) {
      await repository.updateLatestUnitPrice({
        sparePartId: item.sparePartId,
        unitPrice: item.unitPrice,
      });
    }
    await repository.createMovement({
      scope,
      storeId: item.storeId,
      sparePartId: item.sparePartId,
      actorId: actor.id,
      movementType: StockMovementType.RECEIVE,
      refType: "SparePartReceive",
      refId: receive.id,
      quantityChange: item.quantity,
      balanceAfter: stock.balanceAfter,
      unitPrice: item.unitPrice,
      note: item.note,
      occurredAt: input.receivedAt,
    });
  }

  return receive;
}

export async function adjustStockWithRepository(
  repository: Pick<StoreReceiveRepository, "getStockBalance" | "addStock" | "createMovement">,
  actor: StoreActor,
  scope: StoreScope,
  input: AdjustStockInput,
) {
  assertActorInScope(actor, scope);
  assertNonZeroQuantity(input.quantityChange, "Adjustment quantity must not be zero.");
  const note = input.note?.trim();
  if (!note) throw new Error("Adjustment reason is required.");

  const currentBalance = await repository.getStockBalance({
    scope,
    storeId: input.storeId,
    sparePartId: input.sparePartId,
  });
  if (currentBalance + input.quantityChange < 0) {
    throw new Error("Stock balance must not be negative.");
  }

  const stock = await repository.addStock({
    scope,
    storeId: input.storeId,
    sparePartId: input.sparePartId,
    quantity: input.quantityChange,
  });
  await repository.createMovement({
    scope,
    storeId: input.storeId,
    sparePartId: input.sparePartId,
    actorId: actor.id,
    movementType: StockMovementType.ADJUSTMENT,
    quantityChange: input.quantityChange,
    balanceAfter: stock.balanceAfter,
    note,
    occurredAt: input.occurredAt,
  });
  return stock;
}

function assertReceiveInput(input: ReceiveStockInput) {
  if (!input.items.length) {
    throw new Error("Receive stock must include at least one item.");
  }
  for (const item of input.items) {
    assertPositiveQuantity(item.quantity, "Receive quantity must be greater than zero.");
    if (item.unitPrice != null && item.unitPrice < 0) {
      throw new Error("Unit price must not be negative.");
    }
  }
}

function assertPositiveQuantity(quantity: number, message: string) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(message);
  }
}

function assertNonZeroQuantity(quantity: number, message: string) {
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new Error(message);
  }
}

function assertActorInScope(actor: StoreActor, scope: StoreScope) {
  if (actor.plantId && actor.plantId !== scope.plantId) {
    throw new Error("Actor is outside the selected site scope.");
  }
}
