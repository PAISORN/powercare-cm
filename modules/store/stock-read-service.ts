import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { StockListQuery, StockStatus } from "./stock-list-query";

export type StockReadItemKind =
  | "ALL"
  | "SPARE_PART"
  | "CHEMICAL"
  | "OIL"
  | "FUEL";

export type StockReadFilters = {
  search: string;
  storeId: string;
  typeId: string;
  categoryId: string;
  materialGroupId: string;
  itemKind: StockReadItemKind;
  unit: string;
  stockStatus: StockStatus;
};

const stockBalanceInclude = {
  store: {
    select: {
      id: true,
      name: true,
      code: true,
      location: true,
      category: { select: { name: true } },
    },
  },
  sparePart: {
    select: {
      id: true,
      code: true,
      itemCode: true,
      itemKind: true,
      name: true,
      description: true,
      unit: true,
      minStock: true,
      maxStock: true,
      latestUnitPrice: true,
      reorderPoint: true,
      categoryId: true,
      materialGroupId: true,
      typeId: true,
      defaultStoreId: true,
      active: true,
      category: { select: { name: true } },
      materialGroup: { select: { name: true } },
      type: { select: { code: true, name: true } },
    },
  },
} satisfies Prisma.StoreStockInclude;

export type StockBalanceRow = Prisma.StoreStockGetPayload<{
  include: typeof stockBalanceInclude;
}>;

export function stockReadFiltersFromListQuery(
  query: StockListQuery,
): StockReadFilters {
  return {
    search: query.search,
    storeId: query.storeId,
    typeId: query.typeId,
    categoryId: query.categoryId,
    materialGroupId: query.materialGroupId,
    itemKind: query.itemKind ?? "ALL",
    unit: query.unit,
    stockStatus: query.stockStatus,
  };
}

export function buildStockSparePartWhere(
  plantId: string,
  filters: StockReadFilters,
): Prisma.SparePartWhereInput {
  return {
    plantId,
    active: true,
    ...(filters.itemKind === "ALL" ? {} : { itemKind: filters.itemKind }),
    ...(filters.typeId ? { typeId: filters.typeId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.materialGroupId
      ? { materialGroupId: filters.materialGroupId }
      : {}),
    ...(filters.unit ? { unit: filters.unit } : {}),
    ...(filters.search
      ? {
          OR: [
            { code: { contains: filters.search } },
            { itemCode: { contains: filters.search } },
            { name: { contains: filters.search } },
          ],
        }
      : {}),
  };
}

export function buildStockBalanceWhere(
  plantId: string,
  filters: StockReadFilters,
  sparePart = buildStockSparePartWhere(plantId, filters),
): Prisma.StoreStockWhereInput {
  return {
    plantId,
    ...(filters.storeId ? { storeId: filters.storeId } : {}),
    store: { plantId, active: true },
    sparePart,
  };
}

export async function findStockBalanceRows(input: {
  plantId: string;
  filters: StockReadFilters;
  lowStockOnly?: boolean;
}) {
  const rows = await db.storeStock.findMany({
    where: buildStockBalanceWhere(input.plantId, input.filters),
    include: stockBalanceInclude,
    orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
  });

  return rows.filter((row) => {
    const quantity = Number(row.quantity);
    const minimum = Number(row.sparePart.minStock);
    if (input.lowStockOnly && quantity > minimum) return false;
    return matchesStockStatus(quantity, minimum, input.filters.stockStatus);
  });
}

export function matchesStockStatus(
  quantity: number,
  minimum: number,
  status: StockStatus,
) {
  if (status === "available") return quantity > minimum;
  if (status === "nearMin") return quantity > 0 && quantity <= minimum;
  if (status === "outOfStock") return quantity <= 0;
  return true;
}
