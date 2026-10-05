import { db } from "../../lib/db";

export async function loadStockMovementHistory(input: {
  organizationId: string;
  plantId: string;
  stockId: string;
}) {
  const stock = await db.storeStock.findFirst({
    where: {
      id: input.stockId,
      organizationId: input.organizationId,
      plantId: input.plantId,
    },
    select: {
      id: true,
      storeId: true,
      sparePartId: true,
      store: { select: { code: true, name: true } },
      sparePart: {
        select: { code: true, itemCode: true, name: true, unit: true },
      },
    },
  });

  if (!stock) return null;

  const movements = await db.stockMovement.findMany({
    where: {
      organizationId: input.organizationId,
      plantId: input.plantId,
      storeId: stock.storeId,
      sparePartId: stock.sparePartId,
    },
    select: {
      id: true,
      movementType: true,
      quantityChange: true,
      balanceAfter: true,
      unitPrice: true,
      refType: true,
      refId: true,
      note: true,
      occurredAt: true,
      actor: { select: { fullName: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return { stock, movements };
}

export type StockMovementHistory = NonNullable<
  Awaited<ReturnType<typeof loadStockMovementHistory>>
>;
