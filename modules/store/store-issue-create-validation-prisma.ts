import type { Prisma } from "@prisma/client";
import type { StoreIssueItemInput } from "./store-issue-service";
import { StoreIssueType, type StoreScope } from "./store-types";
import { requiredText } from "./store-issue-values";

export async function resolveStoreIssueCmWorkId(
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
export async function assertStoreIssueItemsInScope(
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
      select: { storeId: true, sparePartId: true, sparePart: { select: { itemKind: true } } },
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
  const itemKinds = [...new Set(stockRows.map((row) => row.sparePart.itemKind))];
  if (itemKinds.length !== 1) throw new Error("One Store Issue can contain only one inventory type.");
  if (items.some((item) => !item.zoneId)) {
    throw new Error("Applicable Zone is required for every spare part.");
  }
  if (applicableCount !== zoneIds.length) {
    throw new Error("Selected Applicable Zone is not available for this Site.");
  }
  return itemKinds[0] ?? "SPARE_PART";
}
