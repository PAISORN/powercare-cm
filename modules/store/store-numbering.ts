import { SparePartCodePrefix, SparePartIssuePrefix } from "./store-types";

const bangkokTimeZone = "Asia/Bangkok";

export function normalizeStoreSiteCode(siteCode: string) {
  const normalized = siteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) {
    throw new Error("Site code is required for store numbering.");
  }
  if (normalized.length !== 3) {
    throw new Error("Store Site code must be exactly 3 letters or numbers.");
  }
  return normalized;
}

export function formatSparePartCode(siteCode: string, nextNumber: number) {
  return `${SparePartCodePrefix}-${normalizeStoreSiteCode(siteCode)}-${formatRunningNumber(nextNumber, 5)}`;
}

export function formatSparePartIssueNumber(siteCode: string, issueDate: Date, nextNumber: number) {
  const { year, month } = readBangkokYearMonth(issueDate);
  return `${SparePartIssuePrefix}-${normalizeStoreSiteCode(siteCode)}-${year}-${month}-${formatRunningNumber(nextNumber, 4)}`;
}

export function formatSparePartIssueLineNumber(input: {
  siteCode: string;
  storeCode: string;
  typeCode: string;
  categoryCode: string;
  storageZoneCode: string;
  itemCode: string;
  nextNumber: number;
}) {
  const typeCode = normalizeIssueSegment(input.typeCode, "Spare part type code").replace(/^GL/, "");
  if (!typeCode) throw new Error("Spare part type code is required after removing GL prefix.");
  return [
    normalizeStoreSiteCode(input.siteCode),
    normalizeIssueSegment(input.storeCode, "Store code"),
    typeCode,
    normalizeIssueSegment(input.categoryCode, "Spare part category code"),
    normalizeIssueSegment(input.storageZoneCode, "Storage Zone code"),
    normalizeIssueSegment(input.itemCode, "Item Code"),
    formatRunningNumber(input.nextNumber, 5),
  ].join("-");
}

export function formatStoreIssueSequenceKey(siteCode: string, issueDate: Date) {
  const { year, month } = readBangkokYearMonth(issueDate);
  return `${normalizeStoreSiteCode(siteCode)}-${year}-${month}`;
}

export function getStoreIssuePeriod(issueDate: Date) {
  const { year, month } = readBangkokYearMonth(issueDate);
  return { year: Number(year), month: Number(month) };
}

export function formatSparePartReceiveNumber(siteCode: string, receivedAt: Date, suffix: string) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: bangkokTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(receivedAt)
    .replaceAll("-", "");
  const normalizedSuffix = suffix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (!normalizedSuffix) throw new Error("Receive number suffix is required.");
  return `RCV-${normalizeStoreSiteCode(siteCode)}-${date}-${normalizedSuffix}`;
}

function formatRunningNumber(nextNumber: number, length: number) {
  if (!Number.isInteger(nextNumber) || nextNumber < 1) {
    throw new Error("Running number must be a positive integer.");
  }
  return String(nextNumber).padStart(length, "0");
}

function normalizeIssueSegment(value: string, label: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) throw new Error(`${label} is required for issue numbering.`);
  return normalized;
}

function readBangkokYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: bangkokTimeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) {
    throw new Error("Unable to read Bangkok year and month.");
  }
  return { year, month };
}
