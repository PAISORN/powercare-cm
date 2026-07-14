import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { PermissionKey, type PermissionUserContext } from "../auth/site-admin-permissions";
import { adjustStockWithRepository, type StoreReceiveRepository } from "./store-receive-service";
import { assertActorStoreScope, requireStorePermission } from "./store-prisma-service";
import type { StoreScope } from "./store-types";

export type AdjustStockFormInput = {
  storeId: string;
  sparePartId: string;
  quantityChange: number;
  reason: string;
  occurredAt: Date;
};

export async function adjustStock(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: AdjustStockFormInput,
) {
  requireStorePermission(actor, PermissionKey.ADJUST_STOCK);
  assertActorStoreScope(actor, scope);

  return db.$transaction(async (tx) => {
    await tx.plant.findFirstOrThrow({
      where: { id: scope.plantId, organizationId: scope.organizationId, active: true },
    });
    await assertAdjustmentItemInScope(tx, scope, input);

    const repository: Pick<StoreReceiveRepository, "getStockBalance" | "addStock" | "createMovement"> = {
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
      async addStock(stockInput) {
        if (stockInput.quantity < 0) {
          const requiredBalance = Math.abs(stockInput.quantity);
          const updated = await tx.storeStock.updateMany({
            where: {
              storeId: stockInput.storeId,
              sparePartId: stockInput.sparePartId,
              quantity: { gte: requiredBalance },
            },
            data: { quantity: { increment: stockInput.quantity } },
          });
          if (updated.count !== 1) throw new Error("Stock balance must not be negative.");
        } else {
          await tx.storeStock.upsert({
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
          });
        }
        const stock = await tx.storeStock.findUniqueOrThrow({
          where: {
            storeId_sparePartId: {
              storeId: stockInput.storeId,
              sparePartId: stockInput.sparePartId,
            },
          },
          select: { quantity: true },
        });
        return { balanceAfter: Number(stock.quantity) };
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
            quantityChange: movementInput.quantityChange,
            balanceAfter: movementInput.balanceAfter,
            note: movementInput.note,
            occurredAt: movementInput.occurredAt,
          },
        });
      },
    };

    const result = await adjustStockWithRepository(repository, actor, scope, {
      storeId: input.storeId,
      sparePartId: input.sparePartId,
      quantityChange: input.quantityChange,
      note: input.reason,
      occurredAt: input.occurredAt,
    });
    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        entityType: "StoreStock",
        entityId: `${input.storeId}:${input.sparePartId}`,
        action: "ADJUST_SPARE_PART_STOCK",
        afterJson: JSON.stringify({
          quantityChange: input.quantityChange,
          balanceAfter: result.balanceAfter,
          reason: input.reason.trim(),
        }),
      },
    });
    return result;
  });
}

async function assertAdjustmentItemInScope(
  tx: Prisma.TransactionClient,
  scope: StoreScope,
  input: Pick<AdjustStockFormInput, "storeId" | "sparePartId">,
) {
  const [store, sparePart] = await Promise.all([
    tx.store.findFirst({
      where: { id: input.storeId, plantId: scope.plantId, active: true },
      select: { id: true },
    }),
    tx.sparePart.findFirst({
      where: { id: input.sparePartId, plantId: scope.plantId, active: true },
      select: { id: true },
    }),
  ]);
  if (!store || !sparePart) throw new Error("Stock adjustment item is outside the selected Site.");
}
