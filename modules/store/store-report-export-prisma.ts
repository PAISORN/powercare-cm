import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import {
  buildDailyIssueReportRows,
  summarizePeriodMovementQuantities,
} from "./store-daily-issue-report";
import type { StockStatus } from "./stock-list-query";
import {
  buildStockBalanceWhere,
  buildStockSparePartWhere,
  findStockBalanceRows,
  matchesStockStatus,
  type StockReadFilters,
} from "./stock-read-service";
export async function loadStoreReportExportRows(input: {
  plantId: string;
  reportType:
    "STOCK_BALANCE" | "LOW_STOCK" | "MOVEMENTS" | "ISSUES" | "ISSUE_BY_DATE";
  itemKind: "ALL" | "SPARE_PART" | "CHEMICAL" | "OIL" | "FUEL";
  movementType: string;
  issueStatus: string;
  itemIds: string[];
  search: string;
  storeId: string;
  typeId: string;
  categoryId: string;
  materialGroupId: string;
  unit: string;
  stockStatus: StockStatus;
  range: { start: Date; end: Date };
}) {
  const stockFilters: StockReadFilters = {
    search: input.search,
    storeId: input.storeId,
    typeId: input.typeId,
    categoryId: input.categoryId,
    materialGroupId: input.materialGroupId,
    itemKind: input.itemKind,
    unit: input.unit,
    stockStatus: input.stockStatus,
  };
  const sparePartWhere = buildStockSparePartWhere(input.plantId, stockFilters);
  if (
    input.reportType === "STOCK_BALANCE" ||
    input.reportType === "LOW_STOCK"
  ) {
    const [stocks, periodMovements] = await Promise.all([
      findStockBalanceRows({
        plantId: input.plantId,
        filters: stockFilters,
        lowStockOnly: input.reportType === "LOW_STOCK",
      }),
      db.stockMovement.findMany({
        where: {
          plantId: input.plantId,
          occurredAt: { gte: input.range.start, lte: input.range.end },
          movementType: { in: ["RECEIVE", "ISSUE"] },
          ...(input.storeId ? { storeId: input.storeId } : {}),
          store: { plantId: input.plantId, active: true },
          sparePart: sparePartWhere,
        },
        select: {
          movementType: true,
          quantityChange: true,
          store: { select: { id: true } },
          sparePart: { select: { id: true } },
        },
      }),
    ]);
    const periodTotals = summarizePeriodMovementQuantities(
      periodMovements.map((movement) => ({
        movementType: movement.movementType,
        quantityChange: Number(movement.quantityChange),
        store: movement.store,
        sparePart: movement.sparePart,
      })),
    );
    return [...stocks]
      .sort((left, right) =>
        left.store.code === right.store.code
          ? left.sparePart.code.localeCompare(right.sparePart.code)
          : left.store.code.localeCompare(right.store.code),
      )
      .map((stock) => {
        const totals = periodTotals.get(
          stockKey(stock.storeId, stock.sparePartId),
        ) ?? {
          receivedQuantity: 0,
          issuedQuantity: 0,
        };
        return {
          "Store Code": stock.store.code,
          "Store Name": stock.store.name,
          "Item Type": stock.sparePart.itemKind,
          "Item Code": stock.sparePart.code,
          "Item Name": stock.sparePart.name,
          Category: stock.sparePart.category?.name ?? "-",
          "Material Group": stock.sparePart.materialGroup?.name ?? "-",
          "Received Quantity": totals.receivedQuantity,
          "Issued Quantity": totals.issuedQuantity,
          Quantity: Number(stock.quantity),
          Minimum: Number(stock.sparePart.minStock),
          Unit: stock.sparePart.unit,
          "Unit Price":
            stock.sparePart.latestUnitPrice == null
              ? ""
              : Number(stock.sparePart.latestUnitPrice),
          "Total Value":
            Number(stock.quantity) *
            Number(stock.sparePart.latestUnitPrice ?? 0),
        };
      });
  }
  if (input.reportType === "ISSUE_BY_DATE") {
    const selectedItemWhere: Prisma.SparePartWhereInput = {
      ...sparePartWhere,
      ...(input.itemIds.length ? { id: { in: input.itemIds } } : {}),
    };
    const movements = await db.stockMovement.findMany({
      where: {
        plantId: input.plantId,
        movementType: { in: ["RECEIVE", "ISSUE"] },
        occurredAt: { gte: input.range.start, lte: input.range.end },
        ...(input.storeId ? { storeId: input.storeId } : {}),
        store: { active: true },
        sparePart: selectedItemWhere,
      },
      include: {
        store: { select: { id: true, code: true, name: true } },
        sparePart: {
          select: {
            id: true,
            itemKind: true,
            code: true,
            itemCode: true,
            name: true,
            unit: true,
            minStock: true,
            latestUnitPrice: true,
            category: { select: { name: true } },
            materialGroup: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { occurredAt: "asc" },
        { store: { code: "asc" } },
        { sparePart: { code: "asc" } },
      ],
    });
    const [stockKeys, stockBalances] = await Promise.all([
      matchingStockKeys(input.plantId, stockFilters, selectedItemWhere),
      db.storeStock.findMany({
        where: buildStockBalanceWhere(
          input.plantId,
          stockFilters,
          selectedItemWhere,
        ),
        select: { storeId: true, sparePartId: true, quantity: true },
      }),
    ]);
    const stockQuantities = new Map(
      stockBalances.map((stock) => [
        stockKey(stock.storeId, stock.sparePartId),
        Number(stock.quantity),
      ]),
    );
    const visibleMovements = stockKeys
      ? movements.filter((movement) =>
          stockKeys.has(stockKey(movement.storeId, movement.sparePartId)),
        )
      : movements;
    return buildDailyIssueReportRows(
      visibleMovements.map((movement) => ({
        occurredAt: movement.occurredAt,
        movementType: movement.movementType,
        quantityChange: Number(movement.quantityChange),
        stockQuantity:
          stockQuantities.get(
            stockKey(movement.storeId, movement.sparePartId),
          ) ?? 0,
        unitPrice:
          movement.unitPrice == null ? null : Number(movement.unitPrice),
        store: movement.store,
        sparePart: {
          id: movement.sparePart.id,
          itemKind: movement.sparePart.itemKind,
          code: movement.sparePart.code,
          itemCode: movement.sparePart.itemCode,
          name: movement.sparePart.name,
          unit: movement.sparePart.unit,
          minStock: Number(movement.sparePart.minStock),
          latestUnitPrice:
            movement.sparePart.latestUnitPrice == null
              ? null
              : Number(movement.sparePart.latestUnitPrice),
          categoryName: movement.sparePart.category?.name ?? null,
          materialGroupName: movement.sparePart.materialGroup?.name ?? null,
        },
      })),
      input.range,
    );
  }
  if (input.reportType === "MOVEMENTS") {
    const movements = await db.stockMovement.findMany({
      where: {
        plantId: input.plantId,
        occurredAt: { gte: input.range.start, lte: input.range.end },
        ...(input.storeId ? { storeId: input.storeId } : {}),
        ...(input.movementType === "ALL"
          ? {}
          : { movementType: input.movementType as never }),
        store: { active: true },
        sparePart: sparePartWhere,
      },
      include: { store: true, sparePart: true, actor: true },
      orderBy: { occurredAt: "desc" },
    });
    const stockKeys = await matchingStockKeys(
      input.plantId,
      stockFilters,
      sparePartWhere,
    );
    const visibleMovements = stockKeys
      ? movements.filter((movement) =>
          stockKeys.has(stockKey(movement.storeId, movement.sparePartId)),
        )
      : movements;
    return visibleMovements.map((movement) => ({
      Date: movement.occurredAt.toISOString(),
      Type: movement.movementType,
      "Item Type": movement.sparePart.itemKind,
      "Item Code": movement.sparePart.code,
      "Item Name": movement.sparePart.name,
      Store: movement.store.code,
      Quantity: Number(movement.quantityChange),
      Unit: movement.sparePart.unit,
      Actor: movement.actor?.fullName ?? "-",
      Note: movement.note ?? "",
    }));
  }
  const issueItemWhere = {
    ...(input.storeId ? { storeId: input.storeId } : {}),
    sparePart: sparePartWhere,
  };
  const issues = await db.sparePartIssue.findMany({
    where: {
      plantId: input.plantId,
      requestedAt: { gte: input.range.start, lte: input.range.end },
      ...(input.issueStatus === "ALL"
        ? {}
        : { status: input.issueStatus as never }),
      items: { some: issueItemWhere },
    },
    include: {
      requesterUser: true,
      items: {
        where: issueItemWhere,
        include: { sparePart: true, store: true },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
  const stockKeys = await matchingStockKeys(
    input.plantId,
    stockFilters,
    sparePartWhere,
  );
  return issues.flatMap((issue) =>
    issue.items
      .filter(
        (item) =>
          !stockKeys ||
          stockKeys.has(stockKey(item.storeId ?? "", item.sparePartId)),
      )
      .map((item) => ({
        "Issue Number": issue.number,
        Date: issue.requestedAt.toISOString(),
        Status: issue.status,
        Requester: issue.requesterUser?.fullName ?? issue.requesterName,
        "Item Type": item.sparePart.itemKind,
        "Item Code": item.sparePart.code,
        "Item Name": item.sparePart.name,
        Store: item.store?.code ?? "-",
        Requested: Number(item.requestedQty),
        Approved: item.approvedQty == null ? "" : Number(item.approvedQty),
        Issued: item.issuedQty == null ? "" : Number(item.issuedQty),
        Unit: item.sparePart.unit,
      })),
  );
}

async function matchingStockKeys(
  plantId: string,
  filters: StockReadFilters,
  sparePartWhere: Prisma.SparePartWhereInput,
) {
  if (filters.stockStatus === "all") return null;
  const stocks = await db.storeStock.findMany({
    where: buildStockBalanceWhere(plantId, filters, sparePartWhere),
    select: {
      storeId: true,
      sparePartId: true,
      quantity: true,
      sparePart: { select: { minStock: true } },
    },
  });
  return new Set(
    stocks
      .filter((stock) =>
        matchesStockStatus(
          Number(stock.quantity),
          Number(stock.sparePart.minStock),
          filters.stockStatus,
        ),
      )
      .map((stock) => stockKey(stock.storeId, stock.sparePartId)),
  );
}

function stockKey(storeId: string, sparePartId: string) {
  return `${storeId}:${sparePartId}`;
}
