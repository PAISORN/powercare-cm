"use client";

import { useMemo, useState } from "react";
import type { IssueItemKind } from "./issue-line-items-editor";
import {
  initialStockFilters,
  stockDisplayLabel,
  stockForKey,
  type IssueLine,
  type StockFilters,
  type StockOption,
} from "./issue-stock-selector";

const emptyLine = (id = 1): IssueLine => ({
  id,
  stockKey: "",
  stockSearch: "",
  zoneId: "",
  requestedQty: "",
});

export function useIssueRequestLines({
  initialItemKind,
  stocks,
}: {
  initialItemKind: IssueItemKind;
  stocks: StockOption[];
}) {
  const [lines, setLines] = useState<IssueLine[]>([emptyLine()]);
  const [filters, setFilters] = useState<StockFilters>(initialStockFilters);
  const [itemKind, setItemKind] = useState<IssueItemKind>(initialItemKind);

  const kindStocks = useMemo(
    () =>
      stocks.filter(
        (stock) => (stock.sparePartItemKind ?? "SPARE_PART") === itemKind,
      ),
    [itemKind, stocks],
  );
  const kindNoun =
    itemKind === "CHEMICAL"
      ? "สารเคมี"
      : itemKind === "OIL"
        ? "น้ำมัน"
        : "อะไหล่";
  const activeStoreNames = useMemo(
    () => [
      ...new Set(kindStocks.map((stock) => stock.storeName).filter(Boolean)),
    ],
    [kindStocks],
  );
  const selectedLineCount = lines.filter((line) => line.stockKey).length;
  const requestedTotal = lines.reduce(
    (sum, line) => sum + Number(line.requestedQty || 0),
    0,
  );

  function addLine() {
    setLines((current) => [...current, emptyLine(nextLineId(current))]);
  }

  function changeItemKind(nextItemKind: IssueItemKind) {
    setItemKind(nextItemKind);
    setFilters(initialStockFilters);
    setLines([emptyLine()]);
  }

  function updateLine(lineId: number, next: Partial<IssueLine>) {
    setLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...next } : line)),
    );
  }

  function removeLine(lineId: number) {
    setLines((current) => current.filter((line) => line.id !== lineId));
  }

  function selectScannedStock(stockKey: string) {
    setFilters(initialStockFilters);
    setLines((current) => {
      const stock = stockForKey(stocks, stockKey);
      const stockSearch = stock ? stockDisplayLabel(stock) : "";
      const emptyIndex = current.findIndex((line) => !line.stockKey);

      if (emptyIndex >= 0) {
        return current.map((line, index) =>
          index === emptyIndex
            ? { ...line, stockKey, stockSearch, zoneId: "" }
            : line,
        );
      }

      return [
        ...current,
        {
          ...emptyLine(nextLineId(current)),
          stockKey,
          stockSearch,
        },
      ];
    });
  }

  function resetLines() {
    setItemKind(initialItemKind);
    setLines([emptyLine()]);
    setFilters(initialStockFilters);
  }

  return {
    activeStoreNames,
    addLine,
    changeItemKind,
    filters,
    itemKind,
    kindNoun,
    kindStocks,
    lines,
    removeLine,
    requestedTotal,
    resetLines,
    selectedLineCount,
    selectScannedStock,
    setFilters,
    updateLine,
  };
}

function nextLineId(lines: IssueLine[]) {
  return Math.max(0, ...lines.map((line) => line.id)) + 1;
}
