export const STOCK_ITEM_KINDS = ["SPARE_PART", "CHEMICAL", "OIL"] as const;
export const STOCK_STATUSES = [
  "all",
  "available",
  "nearMin",
  "outOfStock",
] as const;

export type StockItemKind = (typeof STOCK_ITEM_KINDS)[number];
export type StockStatus = (typeof STOCK_STATUSES)[number];

export type StockListQuery = {
  search: string;
  storeId: string;
  typeId: string;
  categoryId: string;
  materialGroupId: string;
  itemKind?: StockItemKind;
  unit: string;
  stockStatus: StockStatus;
  page: number;
};

export type StockListScope = {
  organizationId: string;
  plantId: string;
};

type QueryValue = string | string[] | undefined;
type StockListQueryKey =
  | "search"
  | "storeId"
  | "typeId"
  | "categoryId"
  | "materialGroupId"
  | "itemKind"
  | "unit"
  | "stockStatus"
  | "page";
type StockListQuerySource =
  | Partial<Record<StockListQueryKey, QueryValue>>
  | Pick<URLSearchParams, "get">;

export function parseStockListQuery(source: StockListQuerySource): StockListQuery {
  const requestedPage = Number.parseInt(readQueryValue(source, "page"), 10);
  const itemKind = readQueryValue(source, "itemKind");
  const stockStatus = readQueryValue(source, "stockStatus");

  return {
    search: readQueryValue(source, "search").trim(),
    storeId: readQueryValue(source, "storeId").trim(),
    typeId: readQueryValue(source, "typeId").trim(),
    categoryId: readQueryValue(source, "categoryId").trim(),
    materialGroupId: readQueryValue(source, "materialGroupId").trim(),
    itemKind: STOCK_ITEM_KINDS.includes(itemKind as StockItemKind)
      ? (itemKind as StockItemKind)
      : undefined,
    unit: readQueryValue(source, "unit").trim(),
    stockStatus: STOCK_STATUSES.includes(stockStatus as StockStatus)
      ? (stockStatus as StockStatus)
      : "all",
    page:
      Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

export function buildStockListHref(
  scope: StockListScope,
  query: StockListQuery,
  page = query.page,
) {
  const params = stockListSearchParams(scope, query);
  if (page > 1) params.set("page", String(page));
  return `/dashboardstore/stock?${params.toString()}`;
}

export function buildStockExportHref(
  scope: StockListScope,
  query: StockListQuery,
  format: "pdf" | "xlsx",
) {
  const params = stockListSearchParams(scope, query);
  params.set("source", "stock");
  params.set("reportType", "STOCK_BALANCE");
  params.set("format", format);
  return `/dashboardstore/reports/export?${params.toString()}`;
}

export function buildStockListPositionKey(
  scope: StockListScope,
  query: StockListQuery,
) {
  return `stock:${buildStockListHref(scope, query)}`;
}

export function countStockListFilters(query: StockListQuery) {
  return (
    [
      query.search,
      query.storeId,
      query.typeId,
      query.categoryId,
      query.materialGroupId,
      query.itemKind,
      query.unit,
    ].filter(Boolean).length + Number(query.stockStatus !== "all")
  );
}

export function stockListStateEntries(
  scope: StockListScope,
  query: StockListQuery,
) {
  const entries: Array<[string, string]> = [
    ["organizationId", scope.organizationId],
    ["plantId", scope.plantId],
  ];
  if (query.search) entries.push(["search", query.search]);
  if (query.storeId) entries.push(["storeId", query.storeId]);
  if (query.typeId) entries.push(["typeId", query.typeId]);
  if (query.categoryId) entries.push(["categoryId", query.categoryId]);
  if (query.materialGroupId) {
    entries.push(["materialGroupId", query.materialGroupId]);
  }
  if (query.itemKind) entries.push(["itemKind", query.itemKind]);
  if (query.unit) entries.push(["unit", query.unit]);
  if (query.stockStatus !== "all") {
    entries.push(["stockStatus", query.stockStatus]);
  }
  return entries;
}

function stockListSearchParams(
  scope: StockListScope,
  query: StockListQuery,
) {
  return new URLSearchParams(stockListStateEntries(scope, query));
}

function readQueryValue(source: StockListQuerySource, key: StockListQueryKey) {
  if (isSearchParams(source)) {
    return source.get(key) ?? "";
  }
  const value = source[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function isSearchParams(
  source: StockListQuerySource,
): source is Pick<URLSearchParams, "get"> {
  return typeof (source as Pick<URLSearchParams, "get">).get === "function";
}
