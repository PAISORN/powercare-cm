import { describe, expect, it } from "vitest";
import {
  buildStockExportHref,
  buildStockListHref,
  buildStockListPositionKey,
  countStockListFilters,
  parseStockListQuery,
  stockListStateEntries,
} from "./stock-list-query";

const scope = { organizationId: "org 1", plantId: "plant/1" };

describe("Stock list query contract", () => {
  it("normalizes the supported filters and page", () => {
    expect(
      parseStockListQuery({
        search: "  bearing  ",
        storeId: " store-1 ",
        typeId: "type-1",
        categoryId: "category-1",
        materialGroupId: "group-1",
        itemKind: "CHEMICAL",
        unit: " L ",
        stockStatus: "nearMin",
        page: "3",
      }),
    ).toEqual({
      search: "bearing",
      storeId: "store-1",
      typeId: "type-1",
      categoryId: "category-1",
      materialGroupId: "group-1",
      itemKind: "CHEMICAL",
      unit: "L",
      stockStatus: "nearMin",
      page: 3,
    });
  });

  it("falls back safely for unsupported enum values and pages", () => {
    const query = parseStockListQuery({
      itemKind: "FUEL",
      stockStatus: "unknown",
      page: "-4",
    });

    expect(query.itemKind).toBeUndefined();
    expect(query.stockStatus).toBe("all");
    expect(query.page).toBe(1);
  });

  it("uses the same filters for list, export, and position restoration", () => {
    const query = parseStockListQuery({
      search: "pump seal",
      storeId: "store-1",
      typeId: "type-1",
      categoryId: "category-1",
      materialGroupId: "group-1",
      itemKind: "SPARE_PART",
      unit: "SET",
      stockStatus: "outOfStock",
      page: "4",
    });
    const listHref = buildStockListHref(scope, query);
    const exportHref = buildStockExportHref(scope, query, "xlsx");
    const listParams = new URL(listHref, "https://powercare.local").searchParams;
    const exportParams = new URL(
      exportHref,
      "https://powercare.local",
    ).searchParams;

    for (const key of [
      "organizationId",
      "plantId",
      "search",
      "storeId",
      "typeId",
      "categoryId",
      "materialGroupId",
      "itemKind",
      "unit",
      "stockStatus",
    ]) {
      expect(exportParams.get(key)).toBe(listParams.get(key));
    }
    expect(listParams.get("page")).toBe("4");
    expect(exportParams.has("page")).toBe(false);
    expect(exportParams.get("source")).toBe("stock");
    expect(exportParams.get("reportType")).toBe("STOCK_BALANCE");
    expect(exportParams.get("format")).toBe("xlsx");
    expect(buildStockListPositionKey(scope, query)).toBe(`stock:${listHref}`);
    expect(countStockListFilters(query)).toBe(8);
    expect(new URLSearchParams(stockListStateEntries(scope, query))).toEqual(
      new URLSearchParams(
        [...listParams].filter(([key]) => key !== "page"),
      ),
    );
  });
});
