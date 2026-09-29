import { db } from "../../lib/db";

export async function loadSparePartsPageData(plantId: string) {
  const [
    plantConfig,
    stores,
    partCategories,
    materialGroups,
    partTypes,
    zones,
    storeApplicableZones,
    spareParts,
  ] = await Promise.all([
    db.plant.findUniqueOrThrow({
      where: { id: plantId },
      select: { inventoryCode: true },
    }),
    db.store.findMany({
      where: { plantId },
      include: { category: true, _count: { select: { stocks: true } } },
      orderBy: { name: "asc" },
    }),
    db.sparePartCategory.findMany({
      where: { plantId },
      orderBy: { name: "asc" },
    }),
    db.sparePartMaterialGroup.findMany({
      where: { plantId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    db.sparePartType.findMany({
      where: { plantId },
      orderBy: { name: "asc" },
    }),
    db.zone.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
    }),
    db.storeApplicableZone.findMany({
      where: { plantId },
      orderBy: { code: "asc" },
    }),
    db.sparePart.findMany({
      where: { plantId },
      include: {
        category: true,
        materialGroup: true,
        type: true,
        defaultStore: true,
        stocks: { include: { store: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    materialGroups,
    partCategories,
    partTypes,
    plantConfig,
    spareParts,
    storeApplicableZones,
    stores,
    zones,
  };
}

export type SparePartsPageData = Awaited<
  ReturnType<typeof loadSparePartsPageData>
>;
