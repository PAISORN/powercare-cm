import { db } from "../../lib/db";
import {
  summarizeStockBalances,
  summarizeStockMovements,
  summarizeStoreIssues,
} from "./store-report-service";

type ReportDateRange = {
  start: Date;
  end: Date;
};

export async function loadStoreReportPageData(
  plantId: string,
  range: ReportDateRange,
  canViewStockValue: boolean,
) {
  const [
    stocks,
    movements,
    issues,
    reportItems,
    stores,
    categories,
    materialGroups,
    sparePartTypes,
    units,
  ] = await Promise.all([
    db.storeStock.findMany({
      where: { plantId },
      include: {
        store: { select: { name: true, code: true } },
        sparePart: {
          select: {
            code: true,
            itemCode: true,
            name: true,
            unit: true,
            minStock: true,
            latestUnitPrice: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
    }),
    db.stockMovement.findMany({
      where: {
        plantId,
        occurredAt: { gte: range.start, lte: range.end },
      },
      include: {
        store: { select: { code: true, name: true } },
        sparePart: { select: { code: true, name: true, unit: true } },
        actor: { select: { fullName: true } },
      },
      orderBy: { occurredAt: "desc" },
    }),
    db.sparePartIssue.findMany({
      where: {
        plantId,
        requestedAt: { gte: range.start, lte: range.end },
      },
      include: {
        items: {
          take: 1,
          include: {
            sparePart: {
              select: { category: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    }),
    db.sparePart.findMany({
      where: { plantId, active: true },
      select: {
        id: true,
        code: true,
        itemCode: true,
        itemKind: true,
        name: true,
        typeId: true,
        categoryId: true,
        materialGroupId: true,
        unit: true,
        minStock: true,
        stocks: {
          where: { store: { active: true } },
          select: { storeId: true, quantity: true },
        },
      },
      orderBy: [{ itemKind: "asc" }, { code: "asc" }],
    }),
    db.store.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.sparePartCategory.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.sparePartMaterialGroup.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, categoryId: true, code: true, name: true },
    }),
    db.sparePartType.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.sparePart.findMany({
      where: { plantId, active: true },
      orderBy: { unit: "asc" },
      select: { unit: true },
      distinct: ["unit"],
    }),
  ]);

  const exportItems = reportItems.map((item) => ({
    ...item,
    minStock: Number(item.minStock),
    stocks: item.stocks.map((stock) => ({
      storeId: stock.storeId,
      quantity: Number(stock.quantity),
    })),
  }));
  const stockSummary = summarizeStockBalances(
    stocks.map((stock) => ({
      id: stock.id,
      quantity: Number(stock.quantity),
      storeName: stock.store.name,
      sparePartCode: stock.sparePart.code,
      sparePartName: stock.sparePart.name,
      unit: stock.sparePart.unit,
      minStock: Number(stock.sparePart.minStock),
      latestUnitPrice:
        canViewStockValue && stock.sparePart.latestUnitPrice != null
          ? Number(stock.sparePart.latestUnitPrice)
          : null,
      categoryName: stock.sparePart.category?.name ?? null,
    })),
  );
  const movementSummary = summarizeStockMovements(
    movements.map((movement) => ({
      movementType: movement.movementType,
      quantityChange: Number(movement.quantityChange),
      occurredAt: movement.occurredAt,
    })),
  );
  const issueSummary = summarizeStoreIssues(
    issues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      status: issue.status,
      requestedAt: issue.requestedAt,
      categoryName: issue.items[0]?.sparePart.category?.name ?? null,
    })),
  );

  return {
    categories,
    exportItems,
    issueSummary,
    issues,
    materialGroups,
    movements,
    movementSummary,
    sparePartTypes,
    stockSummary,
    stores,
    units,
  };
}

export type StoreReportPageData = Awaited<
  ReturnType<typeof loadStoreReportPageData>
>;
