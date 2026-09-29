import type { IssueLine, StockOption } from "./issue-stock-selector";

export const INVALID_ISSUE_LINE_MESSAGE =
  "กรุณาเลือกอะไหล่ Zone และระบุจำนวนเต็มที่ไม่เกินสต็อกให้ครบทุกแถว";
export const AGGREGATE_STOCK_EXCEEDED_MESSAGE =
  "จำนวนรวมของอะไหล่รายการเดียวกันเกินจำนวนคงเหลือ";

export function validateIssueLines(
  lines: IssueLine[],
  stocks: Array<Pick<StockOption, "available" | "sparePartId" | "storeId">>,
) {
  const stockByKey = new Map(
    stocks.map((stock) => [stock.storeId + ":" + stock.sparePartId, stock]),
  );
  const totalByStock = new Map<string, number>();

  for (const line of lines) {
    const stock = stockByKey.get(line.stockKey);
    const quantity = Number(line.requestedQty);
    if (
      !stock ||
      !line.zoneId ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > stock.available
    ) {
      return INVALID_ISSUE_LINE_MESSAGE;
    }
    totalByStock.set(
      line.stockKey,
      (totalByStock.get(line.stockKey) ?? 0) + quantity,
    );
  }

  const exceedsAvailableStock = [...totalByStock].some(
    ([stockKey, quantity]) =>
      quantity > (stockByKey.get(stockKey)?.available ?? 0),
  );
  return exceedsAvailableStock ? AGGREGATE_STOCK_EXCEEDED_MESSAGE : null;
}
