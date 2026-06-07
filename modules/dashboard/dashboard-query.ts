import { db } from "../../lib/db";

export async function getDashboardSummary() {
  const [total, byStatus, byCategoryRaw, byZoneRaw, byUrgency, latest] = await Promise.all([
    db.cmWork.count(),
    db.cmWork.groupBy({ by: ["status"], _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["zoneId"], _count: { _all: true } }),
    db.cmWork.groupBy({ by: ["urgency"], _count: { _all: true } }),
    db.cmWork.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { category: true, zone: true },
    }),
  ]);

  const [categories, zones] = await Promise.all([db.category.findMany(), db.zone.findMany()]);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));

  return {
    total,
    byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    byCategory: byCategoryRaw.map((item) => ({ categoryName: categoryNameById.get(item.categoryId) ?? "-", count: item._count._all })),
    byZone: byZoneRaw.map((item) => ({ zoneName: zoneNameById.get(item.zoneId) ?? "-", count: item._count._all })),
    byUrgency: byUrgency.map((item) => ({ urgency: item.urgency, count: item._count._all })),
    latest,
  };
}
