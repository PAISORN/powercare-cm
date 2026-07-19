import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

try {
  const plants = await db.plant.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      inventoryCode: true,
      organization: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  for (const plant of plants) {
    const [stocks, zones, cmCount] = await Promise.all([
      db.storeStock.findMany({
        where: { plantId: plant.id, quantity: { gt: 0 } },
        select: {
          quantity: true,
          store: { select: { id: true, code: true, name: true, active: true, plantId: true } },
          sparePart: {
            select: {
              id: true,
              code: true,
              itemCode: true,
              name: true,
              active: true,
              plantId: true,
              type: { select: { code: true, name: true, active: true } },
              category: { select: { code: true, name: true, active: true } },
            },
          },
        },
      }),
      db.storeApplicableZone.findMany({
        where: { plantId: plant.id, active: true, zone: { active: true } },
        select: { code: true, zone: { select: { id: true, name: true, plantId: true } } },
        orderBy: { code: "asc" },
      }),
      db.cmWork.count({ where: { plantId: plant.id, organizationId: plant.organization.id } }),
    ]);

    const invalidStocks = stocks.flatMap((stock) => {
      const reasons = [
        !stock.store.active && "inactive store",
        stock.store.plantId !== plant.id && "store belongs to another site",
        !stock.sparePart.active && "inactive spare part",
        stock.sparePart.plantId !== plant.id && "spare part belongs to another site",
        !stock.sparePart.itemCode?.trim() && "missing item code",
        !stock.sparePart.type?.active && "missing/inactive type",
        !stock.sparePart.type?.code?.trim() && "missing type code",
        !stock.sparePart.category?.active && "missing/inactive category",
        !stock.sparePart.category?.code?.trim() && "missing category code",
      ].filter(Boolean) as string[];
      return reasons.length
        ? [{ sparePart: `${stock.sparePart.code} ${stock.sparePart.name}`, store: stock.store.code, reasons }]
        : [];
    });

    console.log(JSON.stringify({
      organization: plant.organization.name,
      site: plant.name,
      inventoryCode: plant.inventoryCode,
      cmCount,
      positiveStockRows: stocks.length,
      validStockRows: stocks.length - invalidStocks.length,
      invalidStockRows: invalidStocks.length,
      activeApplicableZones: zones.map((entry) => `${entry.code}:${entry.zone.name}`),
      zonesOutsideSite: zones.filter((entry) => entry.zone.plantId !== plant.id).length,
      invalidExamples: invalidStocks.slice(0, 20),
    }, null, 2));
  }
} finally {
  await db.$disconnect();
}
