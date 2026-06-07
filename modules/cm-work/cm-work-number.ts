export function formatCmWorkNumber(date: Date, monthlySequence: number) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const sequence = String(monthlySequence).padStart(4, "0");
  return `CM-${year}-${month}-${sequence}`;
}
