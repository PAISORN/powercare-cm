export function formatCmWorkNumber(siteCode: string, date: Date, monthlySequence: number) {
  const normalizedSiteCode = siteCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalizedSiteCode) throw new Error("Site code is required for CM work numbering");
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const sequence = String(monthlySequence).padStart(4, "0");
  return `CM-${normalizedSiteCode}-${year}-${month}-${sequence}`;
}
