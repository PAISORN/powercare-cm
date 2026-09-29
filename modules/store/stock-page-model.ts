export const STOCK_PAGE_SIZE = 50;

export type StockPageModelRow = {
  id: string;
  quantity: unknown;
  sparePart: {
    name: string;
    minStock: unknown;
    latestUnitPrice: unknown;
    category: { name: string } | null;
  };
};

export function buildStockPageModel<T extends StockPageModelRow>(
  stocks: T[],
  requestedPage: number,
  pageSize = STOCK_PAGE_SIZE,
) {
  const totalQuantity = stocks.reduce(
    (sum, stock) => sum + Number(stock.quantity),
    0,
  );
  const totalValue = stocks.reduce(
    (sum, stock) =>
      sum +
      Number(stock.quantity) * Number(stock.sparePart.latestUnitPrice ?? 0),
    0,
  );
  const nearMinCount = stocks.filter((stock) => {
    const quantity = Number(stock.quantity);
    return quantity > 0 && quantity <= Number(stock.sparePart.minStock);
  }).length;
  const outOfStockCount = stocks.filter(
    (stock) => Number(stock.quantity) <= 0,
  ).length;

  const groupedStocks = [...stocks].sort((left, right) => {
    const leftCategory = left.sparePart.category?.name ?? "";
    const rightCategory = right.sparePart.category?.name ?? "";
    if (leftCategory !== rightCategory) {
      return leftCategory.localeCompare(rightCategory, "th");
    }
    return left.sparePart.name.localeCompare(right.sparePart.name, "th");
  });

  const safePageSize = Math.max(1, Math.trunc(pageSize));
  const totalPages = Math.max(1, Math.ceil(groupedStocks.length / safePageSize));
  const currentPage = Math.min(
    Math.max(1, Math.trunc(requestedPage)),
    totalPages,
  );
  const pageStart = groupedStocks.length
    ? (currentPage - 1) * safePageSize + 1
    : 0;
  const pageEnd = Math.min(currentPage * safePageSize, groupedStocks.length);
  const pagedStocks = groupedStocks.slice(
    pageStart ? pageStart - 1 : 0,
    pageEnd,
  );

  const categoryRunningNumbers = new Map<string, number>();
  const stockRowNumbers = new Map<string, number>();
  groupedStocks.forEach((stock) => {
    const categoryName = stock.sparePart.category?.name ?? "ไม่ระบุหมวดหมู่";
    const categoryRunning = (categoryRunningNumbers.get(categoryName) ?? 0) + 1;
    categoryRunningNumbers.set(categoryName, categoryRunning);
    stockRowNumbers.set(stock.id, categoryRunning);
  });

  return {
    summary: {
      totalQuantity,
      totalValue,
      itemCount: stocks.length,
      nearMinCount,
      outOfStockCount,
    },
    groupedStocks,
    currentPage,
    pageStart,
    pageEnd,
    pagedStocks,
    stockRowNumbers,
    totalPages,
  };
}
