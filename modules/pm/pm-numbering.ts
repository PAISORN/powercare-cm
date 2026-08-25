const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function normalizePmSiteCode(siteCode: string) {
  const normalized = siteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) throw new Error("Site code is required for PM numbering.");
  if (normalized.length > 12) {
    throw new Error("PM Site code must be 12 characters or fewer after normalization.");
  }
  return normalized;
}

export function formatPmPlanNumber(siteCode: string, creationDateKey: string, planSequence: number) {
  return `PMP-${normalizePmSiteCode(siteCode)}-${formatDateKey(creationDateKey)}-${formatSequence(planSequence)}`;
}

export function formatPmWorkNumber(
  siteCode: string,
  creationDateKey: string,
  planSequence: number,
  workSequence: number,
) {
  return `PM-${normalizePmSiteCode(siteCode)}-${formatDateKey(creationDateKey)}-${formatSequence(planSequence)}-${formatSequence(workSequence)}`;
}

function formatDateKey(dateKey: string) {
  if (!dateKeyPattern.test(dateKey)) throw new Error("PM creation date key must use YYYY-MM-DD.");
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error("PM creation date key must be a valid calendar date.");
  }
  return dateKey.replaceAll("-", "");
}

function formatSequence(sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("PM sequence must be a positive integer.");
  }
  return String(sequence).padStart(3, "0");
}
