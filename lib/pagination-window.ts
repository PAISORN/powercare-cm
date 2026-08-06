export function paginationWindow(currentPage: number, totalPages: number, windowSize = 3) {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const safeSize = Math.max(1, Math.floor(windowSize));
  const safeCurrent = Math.min(Math.max(1, Math.floor(currentPage)), safeTotal);
  const start = Math.floor((safeCurrent - 1) / safeSize) * safeSize + 1;
  const end = Math.min(safeTotal, start + safeSize - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
