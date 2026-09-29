import type { Prisma } from "@prisma/client";
import type { StoreIssueItemInput } from "./store-issue-service";
import { formatSparePartIssueLineNumber } from "./store-numbering";
import type { StoreScope } from "./store-types";

export async function reserveStoreIssueLineNumbers(
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
