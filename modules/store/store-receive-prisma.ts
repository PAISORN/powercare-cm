import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  PermissionKey,
  type PermissionUserContext,
} from "../auth/site-admin-permissions";
import { formatSparePartReceiveNumber } from "./store-numbering";
import {
  assertActorStoreScope,
  requireStorePermission,
} from "./store-authorization";
import {
  receiveStockWithRepository,
  type ReceiveStockItemInput,
  type StoreReceiveRepository,
} from "./store-receive-service";
import { runStoreMutation } from "./store-mutation-prisma";
import type { StoreScope } from "./store-types";
import { hasInventoryResponsibility } from "./inventory-user-scope";

export type ReceiveStockFormInput = {
  supplierName?: string | null;
  referenceNo?: string | null;
  note?: string | null;
  receivedAt: Date;
  items: ReceiveStockItemInput[];
};

export async function receiveStock(
  actor: PermissionUserContext & {
    id: string;
    inventoryScopes?: Array<{
      itemKind: string;
      responsibilityEnabled: boolean;
    }>;
  },
  scope: StoreScope,
  input: ReceiveStockFormInput,
) {
  requireStorePermission(actor, PermissionKey.RECEIVE_STOCK);
  assertActorStoreScope(actor, scope);

  return runStoreMutation(actor.id, scope, async (tx) => {
    await assertReceiveItemsInScope(tx, scope, input.items);
    const kinds = await tx.sparePart.findMany({
      where: {
        id: { in: [...new Set(input.items.map((item) => item.sparePartId))] },
        plantId: scope.plantId,
        active: true,
      },
      select: { itemKind: true },
    });
    const itemKinds = [...new Set(kinds.map((item) => item.itemKind))];
    if (
      itemKinds.length !== 1 ||
      !hasInventoryResponsibility(actor, itemKinds[0])
    ) {
      throw new Error("No receive scope for this inventory type.");
    }

    const repository: StoreReceiveRepository = {
      async createReceive(receiveInput) {
        return tx.sparePartReceive.create({
          data: {
            number: receiveInput.number,
            organizationId: receiveInput.scope.organizationId,
            plantId: receiveInput.scope.plantId,
            receivedById: receiveInput.actorId,
            supplierName: receiveInput.supplierName,
            referenceNo: receiveInput.referenceNo,
            note: receiveInput.note,
            status: receiveInput.status,
            receivedAt: receiveInput.receivedAt,
            items: {
              create: receiveInput.items.map((item) => ({
                storeId: item.storeId,
                sparePartId: item.sparePartId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                note: item.note,
              })),
            },
          },
          select: { id: true },
        });
      },
      async addStock(stockInput) {
        const stock = await tx.storeStock.upsert({
          where: {
            storeId_sparePartId: {
              storeId: stockInput.storeId,
              sparePartId: stockInput.sparePartId,
            },
          },
          update: { quantity: { increment: stockInput.quantity } },
          create: {
            organizationId: stockInput.scope.organizationId,
            plantId: stockInput.scope.plantId,
            storeId: stockInput.storeId,
            sparePartId: stockInput.sparePartId,
            quantity: stockInput.quantity,
          },
          select: { quantity: true },
        });
        return { balanceAfter: Number(stock.quantity) };
      },
      async getStockBalance(stockInput) {
        const stock = await tx.storeStock.findUnique({
          where: {
            storeId_sparePartId: {
              storeId: stockInput.storeId,
              sparePartId: stockInput.sparePartId,
            },
          },
          select: { quantity: true },
        });
        return Number(stock?.quantity ?? 0);
      },
      async updateLatestUnitPrice(priceInput) {
        await tx.sparePart.update({
          where: { id: priceInput.sparePartId },
          data: { latestUnitPrice: priceInput.unitPrice },
        });
      },
      async createMovement(movementInput) {
        await tx.stockMovement.create({
          data: {
            organizationId: movementInput.scope.organizationId,
            plantId: movementInput.scope.plantId,
            storeId: movementInput.storeId,
            sparePartId: movementInput.sparePartId,
            actorId: movementInput.actorId,
            movementType: movementInput.movementType,
            refType: movementInput.refType,
            refId: movementInput.refId,
            quantityChange: movementInput.quantityChange,
            balanceAfter: movementInput.balanceAfter,
            unitPrice: movementInput.unitPrice,
            note: movementInput.note,
            occurredAt: movementInput.occurredAt,
          },
        });
      },
    };

    const result = await receiveStockWithRepository(repository, actor, scope, {
      ...input,
      number: formatSparePartReceiveNumber(
        scope.plantCode,
        input.receivedAt,
        randomUUID().slice(0, 6),
      ),
    });
    return {
      value: result,
      audit: {
        entityType: "SparePartReceive",
        entityId: result.id,
        action: "RECEIVE_SPARE_PART_STOCK",
        after: {
          itemCount: input.items.length,
          referenceNo: input.referenceNo ?? null,
        },
      },
    };
  });
}

async function assertReceiveItemsInScope(
  tx: Prisma.TransactionClient,
  scope: StoreScope,
  items: ReceiveStockItemInput[],
) {
  const storeIds = [...new Set(items.map((item) => item.storeId))];
  const sparePartIds = [...new Set(items.map((item) => item.sparePartId))];
  const [storeCount, sparePartCount] = await Promise.all([
    tx.store.count({
      where: { id: { in: storeIds }, plantId: scope.plantId, active: true },
    }),
    tx.sparePart.count({
      where: { id: { in: sparePartIds }, plantId: scope.plantId, active: true },
    }),
  ]);
  if (
    storeCount !== storeIds.length ||
    sparePartCount !== sparePartIds.length
  ) {
    throw new Error("Receive item is outside the selected Site.");
  }
}
