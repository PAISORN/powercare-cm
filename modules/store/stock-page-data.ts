import { db } from "../../lib/db";
import type { StockListQuery } from "./stock-list-query";
import {
  findStockBalanceRows,
  stockReadFiltersFromListQuery,
} from "./stock-read-service";

export async function loadStockPageData(
  plantId: string,
  stockQuery: StockListQuery,
) {
  const [
    stores,
    categories,
    materialGroups,
    sparePartTypes,
    issueZones,
    units,
    stocks,
    searchSuggestions,
  ] = await Promise.all([
    db.store.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, location: true },
    }),
    db.sparePartCategory.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    db.sparePartMaterialGroup.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, categoryId: true, name: true, code: true },
    }),
    db.sparePartType.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    db.storeApplicableZone.findMany({
      where: { plantId, active: true, zone: { active: true } },
      orderBy: { code: "asc" },
      select: { code: true, zone: { select: { id: true, name: true } } },
    }),
    db.sparePart.findMany({
      where: { plantId, active: true },
      orderBy: { unit: "asc" },
      select: { unit: true },
      distinct: ["unit"],
    }),
    findStockBalanceRows({
      plantId,
      filters: stockReadFiltersFromListQuery(stockQuery),
    }),
    db.sparePart.findMany({
      where: { plantId, active: true },
      select: { id: true, code: true, itemCode: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return {
    stores,
    categories,
    materialGroups,
    sparePartTypes,
    issueZones,
    units,
    stocks,
    searchSuggestions,
  };
}

export type StockPageData = Awaited<ReturnType<typeof loadStockPageData>>;
